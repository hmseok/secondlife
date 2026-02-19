import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'
import { requireAuth } from '../../utils/auth-guard'

// ⚡️ [엔진] 2.0 Flash (PDF 분석도 빠르고 정확함)
const MODEL_MAIN = "gemini-2.0-flash";

async function callGeminiAI(base64Data: string, mimeType: string) {
  const apiKey = process.env.GEMINI_API_KEY;

  const systemInstruction = `
    당신은 대한민국 자동차 할부/대출 견적서(할부 견적서) 분석 전문가입니다.
    이미지 또는 PDF 문서를 분석하여 차량 정보, 가격 정보, 대출 조건을 정확히 추출하세요.
    
    [중요 지침]
    1. 여러 견적안이 있는 경우(①②③) 첫 번째 견적안만 추출
    2. 가격은 숫자만 추출 (단위 제거, 쉼표 제거)
    3. 날짜는 YYYY-MM-DD 형식으로 통일
    4. 금리/비율은 % 기호 제거하고 숫자만 추출
  `;

  const prompt = `
    ${systemInstruction}

    [필수 추출 항목]
    다음 필드들을 문서에서 찾아 JSON 형식으로 추출하세요:

    1. **quote_number**: 견적번호 (예: "2025-00001")
    2. **quote_date**: 견적일자 (YYYY-MM-DD 형식)
    3. **valid_date**: 유효일자 (YYYY-MM-DD 형식)
    4. **dealer_name**: 딜러/전시장명
    5. **dealer_location**: 딜러 위치/주소
    6. **vehicle_name**: 차종명 (예: "기아 카니발 3.0 가솔린 11인승")
    7. **vehicle_price**: 차량금액 (숫자만)
    8. **discount_amount**: 할인금액 (숫자만)
    9. **sale_price**: 차량판매금액 (숫자만)
    10. **option_amount**: 옵션금액 (숫자만)
    11. **displacement**: 배기량 (예: "1,991cc" 또는 "3,000cc")
    12. **fuel_type**: 연료 (예: "가솔린", "경유", "전기", "하이브리드")
    13. **finance_months**: 대출기간 (개월수, 숫자만)
    14. **advance_rate**: 선수금율 (%, 숫자만)
    15. **deposit**: 선수금액 (숫자만)
    16. **grace_rate**: 유예율 (%, 숫자만)
    17. **grace_amount**: 유예금 (숫자만)
    18. **total_amount**: 대출신청금액 (숫자만)
    19. **interest_rate**: 적용금리 (%, 숫자만)
    20. **monthly_payment**: 월납입료 (숫자만)
    21. **acquisition_tax**: 통합취득세 (숫자만)
    22. **bond_cost**: 공채 (숫자만)
    23. **misc_fees**: 부대비용/탁송료포함 (숫자만)
    24. **stamp_duty**: 인지대 (숫자만)
    25. **customer_initial_payment**: 고객 초기 납입금 (숫자만)

    [JSON 출력 포맷]
    {
      "quote_number": "2025-00001",
      "quote_date": "2025-02-19",
      "valid_date": "2025-03-20",
      "dealer_name": "서울 OO 자동차",
      "dealer_location": "서울시 강남구 테헤란로",
      "vehicle_name": "기아 카니발 3.0 가솔린 11인승",
      "vehicle_price": 42500000,
      "discount_amount": 2500000,
      "sale_price": 40000000,
      "option_amount": 3000000,
      "displacement": "3,000cc",
      "fuel_type": "가솔린",
      "finance_months": 60,
      "advance_rate": 20,
      "deposit": 8000000,
      "grace_rate": 10,
      "grace_amount": 3200000,
      "total_amount": 32000000,
      "interest_rate": 3.99,
      "monthly_payment": 612000,
      "acquisition_tax": 4000000,
      "bond_cost": 200000,
      "misc_fees": 800000,
      "stamp_duty": 50000,
      "customer_initial_payment": 9050000
    }

    [추출 불가능한 필드 처리]
    - 찾을 수 없는 필드는 null 값으로 설정
    - 숫자 필드가 없으면 null, 텍스트 필드가 없으면 빈 문자열 ""
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
                // 🔥 [핵심] 파일 타입(MIME)을 동적으로 전달
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
  const auth = await requireAuth(request)
  if (auth.error) return auth.error

  try {
    const { imageBase64, mimeType } = await request.json()
    const base64Data = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;
    // 기본값은 jpeg
    const finalMimeType = mimeType || "image/jpeg";

    console.log(`🚀 [할부견적분석] ${MODEL_MAIN} 가동 (${finalMimeType})`);
    const result = await callGeminiAI(base64Data, finalMimeType);

    console.log(`✅ [완료] ${result.vehicle_name || 'Unknown'}`);
    return NextResponse.json(result);

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
