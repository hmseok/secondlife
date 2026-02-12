import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'
import { requireAuth } from '../../utils/auth-guard'

// ⚡️ Gemini 2.0 Flash — 견적서 파싱용
const MODEL = 'gemini-2.0-flash'

const PROMPT = `
너는 대한민국 자동차 공식 견적서/가격표 문서 분석기야.
업로드된 문서(PDF 또는 이미지)에서 차량 가격 정보를 추출해서 JSON으로 출력해라.
반드시 JSON 코드 블록만 출력하고, 설명이나 사족은 절대 쓰지 마.

[추출 규칙]
1. 문서에 있는 모든 차종, 트림, 옵션 정보를 빠짐없이 추출
2. 가격은 원(₩) 단위 정수로 변환 (쉼표 제거)
3. 트림은 가격 오름차순 정렬
4. 부가세 포함 출고가 기준
5. 문서에서 확인된 정보만 넣고, 추측하지 마
6. ★★★ 개별소비세 구분이 있으면 반드시 분리해라 ★★★
   - "개별소비세 5%" 가격표와 "개별소비세 3.5%" 가격표가 각각 있으면 별도 variant로 분리
   - consumption_tax 필드에 "개별소비세 5%", "개별소비세 3.5%" 등 명시
   - 세율 구분이 없으면(1가지만 있으면) consumption_tax는 빈 문자열("")

[JSON 형식]
\`\`\`json
{
  "brand": "브랜드명",
  "model": "모델명",
  "year": 2025,
  "source": "견적서 업로드",
  "variants": [
    {
      "variant_name": "차종 그룹명 (예: 1.6 가솔린, 2.0 디젤 등)",
      "fuel_type": "휘발유/경유/LPG/전기/하이브리드",
      "engine_cc": 1598,
      "consumption_tax": "개별소비세 5%",
      "trims": [
        {
          "name": "트림명",
          "base_price": 25000000,
          "note": "주요사양 1줄",
          "options": [
            { "name": "옵션명", "price": 500000, "description": "설명" }
          ]
        }
      ]
    }
  ],
  "available": true,
  "message": "견적서에서 추출한 데이터입니다."
}
\`\`\`

위 형식의 JSON 코드 블록만 출력하라. 다른 텍스트는 절대 쓰지 마라.
`

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth.error) return auth.error

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json(
        { error: '파일이 업로드되지 않았습니다.' },
        { status: 400 }
      )
    }

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY가 설정되지 않았습니다.' },
        { status: 500 }
      )
    }

    // 파일 → base64 변환
    const bytes = await file.arrayBuffer()
    const base64Data = Buffer.from(bytes).toString('base64')

    // MIME 타입 결정
    let mimeType = file.type
    if (!mimeType || mimeType === 'application/octet-stream') {
      const name = file.name.toLowerCase()
      if (name.endsWith('.pdf')) mimeType = 'application/pdf'
      else if (name.endsWith('.png')) mimeType = 'image/png'
      else if (name.endsWith('.jpg') || name.endsWith('.jpeg')) mimeType = 'image/jpeg'
      else if (name.endsWith('.webp')) mimeType = 'image/webp'
      else mimeType = 'application/pdf'
    }

    console.log(`📄 [견적서파싱] 파일: ${file.name} (${mimeType}, ${Math.round(bytes.byteLength / 1024)}KB)`)

    // Gemini에 파일 + 프롬프트 전송
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  inline_data: {
                    mime_type: mimeType,
                    data: base64Data,
                  },
                },
                { text: PROMPT },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 8192,
          },
        }),
      }
    )

    if (!response.ok) {
      const errText = await response.text()
      console.error(`❌ [견적서파싱] Gemini API 에러: ${errText.substring(0, 500)}`)
      return NextResponse.json(
        { error: `AI 분석 실패: ${errText.substring(0, 200)}` },
        { status: 500 }
      )
    }

    const data = await response.json()
    const parts = data.candidates?.[0]?.content?.parts || []
    const rawText = parts
      .filter((p: any) => p.text)
      .map((p: any) => p.text)
      .join('\n')

    if (!rawText) {
      return NextResponse.json(
        { error: 'AI 응답이 비어있습니다.' },
        { status: 500 }
      )
    }

    console.log(`📝 [견적서파싱] AI 응답: ${rawText.length}자`)

    // JSON 추출
    const jsonMatch =
      rawText.match(/```json\s*([\s\S]*?)```/) ||
      rawText.match(/```\s*([\s\S]*?)```/) ||
      rawText.match(/(\{[\s\S]*\})/)

    if (!jsonMatch) {
      console.error(`❌ [견적서파싱] JSON 추출 실패:\n${rawText.substring(0, 1000)}`)
      return NextResponse.json(
        { error: 'AI 응답에서 JSON을 추출할 수 없습니다.', rawText: rawText.substring(0, 500) },
        { status: 500 }
      )
    }

    let jsonStr = jsonMatch[1].trim()
    jsonStr = jsonStr.replace(/,\s*([}\]])/g, '$1')

    const result = JSON.parse(jsonStr)
    result.source = `견적서 업로드 (${file.name})`

    console.log(`✅ [견적서파싱] ${result.brand} ${result.model} — 차종 ${result.variants?.length || 0}개`)

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('❌ [견적서파싱] 에러:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
