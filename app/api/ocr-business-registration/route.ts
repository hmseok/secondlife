import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'

// ⚡️ 사업자등록증 OCR — 회원가입 시 사용 (인증 불필요)
// 회원가입 전이므로 requireAuth를 사용하지 않음
const MODEL_MAIN = "gemini-2.0-flash";

async function extractBusinessNumber(base64Data: string, mimeType: string) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('서버 설정 오류: API 키가 없습니다.');

  const prompt = `
    당신은 대한민국 사업자등록증 분석 전문가입니다.
    첨부된 문서(이미지 또는 PDF)에서 핵심 정보를 정확히 추출하세요.

    [문서 유형]
    - 사진(JPG, PNG, WEBP): 사업자등록증을 촬영한 이미지
    - PDF: 사업자등록증 스캔본 또는 전자문서 (여러 페이지일 경우 첫 페이지가 사업자등록증)

    [추출 규칙]
    1. 사업자등록번호: 10자리 숫자 (예: 123-45-67890), 하이픈 포함 형태로 반환 (XXX-XX-XXXXX)
    2. 상호(법인명): "상호(법인명)" 또는 "상호" 란의 값. 괄호 안 법인명이 있으면 함께 포함
    3. 대표자명: "성명(대표자)" 란의 값
    4. 인식이 불가능한 필드는 빈 문자열로 반환

    [JSON 출력 포맷 - 반드시 이 형태로만 응답]
    {
      "business_number": "123-45-67890",
      "company_name": "OO렌탈",
      "company_name_full": "주식회사 OO렌탈",
      "representative": "홍길동",
      "confidence": "high"
    }

    company_name: 순수 상호명 (주식회사, (주), (유) 등 법인 형태 접두/접미어 제거)
    company_name_full: 원본 그대로 (법인 형태 포함)

    confidence는 인식 확신도입니다:
    - "high": 선명하게 읽힘
    - "medium": 일부 불확실하지만 판독 가능
    - "low": 불선명하여 정확도 낮음
    - "fail": 사업자등록증이 아니거나 인식 불가
  `;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_MAIN}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: prompt },
            { inline_data: { mime_type: mimeType, data: base64Data } }
          ]
        }],
        generationConfig: { response_mime_type: "application/json" }
      })
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`AI Error: ${errText}`);
  }

  const data = await response.json();
  const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawText) throw new Error("AI 응답 없음");

  return JSON.parse(rawText.replace(/```json/g, '').replace(/```/g, '').trim());
}

export async function POST(request: NextRequest) {
  // 회원가입 시 사용하므로 인증 불필요 — 대신 rate limiting 고려
  try {
    const { imageBase64, mimeType } = await request.json()

    if (!imageBase64) {
      return NextResponse.json({ error: '이미지 데이터가 필요합니다.' }, { status: 400 })
    }

    const base64Data = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;
    const finalMimeType = mimeType || "image/jpeg";

    console.log(`🔍 [사업자등록증 OCR] ${MODEL_MAIN} 가동 (${finalMimeType})`);
    const result = await extractBusinessNumber(base64Data, finalMimeType);

    console.log(`✅ [사업자등록증] 추출 완료: ${result.business_number} (${result.confidence})`);
    return NextResponse.json(result);

  } catch (error: any) {
    console.error('사업자등록증 OCR 에러:', error.message);
    return NextResponse.json({ error: error.message || 'OCR 처리 실패' }, { status: 500 })
  }
}
