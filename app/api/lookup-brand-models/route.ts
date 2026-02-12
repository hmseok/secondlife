import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'
import { requireAuth } from '../../utils/auth-guard'

const MODEL = 'gemini-2.0-flash'

const BRAND_OFFICIAL_SITES: Record<string, { url: string; domain: string }> = {
  '기아':       { url: 'https://www.kia.com/kr/',            domain: 'kia.com/kr' },
  '현대':       { url: 'https://www.hyundai.com/kr/',        domain: 'hyundai.com/kr' },
  '제네시스':   { url: 'https://www.genesis.com/kr/',        domain: 'genesis.com/kr' },
  '쉐보레':     { url: 'https://www.chevrolet.co.kr/',       domain: 'chevrolet.co.kr' },
  '르노코리아': { url: 'https://www.renaultkorea.com/',      domain: 'renaultkorea.com' },
  'KG모빌리티': { url: 'https://www.kgmobility.com/',       domain: 'kgmobility.com' },
  'BMW':        { url: 'https://www.bmw.co.kr/',             domain: 'bmw.co.kr' },
  '벤츠':       { url: 'https://www.mercedes-benz.co.kr/',   domain: 'mercedes-benz.co.kr' },
  '메르세데스': { url: 'https://www.mercedes-benz.co.kr/',   domain: 'mercedes-benz.co.kr' },
  '아우디':     { url: 'https://www.audi.co.kr/',            domain: 'audi.co.kr' },
  '폭스바겐':   { url: 'https://www.volkswagen.co.kr/',      domain: 'volkswagen.co.kr' },
  '볼보':       { url: 'https://www.volvocars.com/kr/',      domain: 'volvocars.com/kr' },
  '테슬라':     { url: 'https://www.tesla.com/ko_kr',        domain: 'tesla.com' },
  '토요타':     { url: 'https://www.toyota.co.kr/',          domain: 'toyota.co.kr' },
  '렉서스':     { url: 'https://www.lexus.co.kr/',           domain: 'lexus.co.kr' },
  '혼다':       { url: 'https://www.honda.co.kr/',           domain: 'honda.co.kr' },
  '포르쉐':     { url: 'https://www.porsche.com/korea/',     domain: 'porsche.com/korea' },
  '랜드로버':   { url: 'https://www.landrover.co.kr/',       domain: 'landrover.co.kr' },
  '미니':       { url: 'https://www.mini.co.kr/',            domain: 'mini.co.kr' },
  '푸조':       { url: 'https://www.peugeot.co.kr/',         domain: 'peugeot.co.kr' },
}

function getOfficialSite(brand: string): { url: string; domain: string } {
  const normalized = brand.trim()
  if (BRAND_OFFICIAL_SITES[normalized]) return BRAND_OFFICIAL_SITES[normalized]
  for (const [key, site] of Object.entries(BRAND_OFFICIAL_SITES)) {
    if (normalized.toUpperCase().includes(key.toUpperCase()) || key.toUpperCase().includes(normalized.toUpperCase())) {
      return site
    }
  }
  return { url: `${brand} 공식 홈페이지`, domain: '' }
}

async function fetchBrandModels(brand: string) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY 환경변수가 설정되지 않았습니다.')

  const site = getOfficialSite(brand)

  const prompt = `
너는 대한민국 자동차 모델 목록 조회기야. 반드시 JSON 코드 블록만 출력하고 설명은 쓰지 마.

★★★ 핵심: 반드시 공식 홈페이지(${site.domain})에서만 데이터를 가져와라 ★★★
제3자 사이트, 블로그, 뉴스 데이터는 절대 사용하지 마라.

[작업]
"${brand}" 공식 홈페이지(${site.url})를 url_context로 직접 방문해서, 현재 판매 중인 모든 차량 모델 목록을 조회해라.

[핵심 규칙 — 공식 사이트 구조를 그대로 반영]
1. 반드시 ${site.domain} 도메인의 URL만 방문해라
2. 공식 홈페이지의 차량 라인업 페이지를 직접 확인해라
3. 공식 사이트에 나오는 카테고리(분류)를 그대로 사용해라
   예: 현대 → "승용", "SUV", "MPV", "전기/수소차", "N"
   예: 기아 → "승용", "SUV", "전기차", "상용/밴"
   예: BMW → "세단", "SAV/SAC", "전기차(i)", "M"
3. 모델명도 공식 사이트 표기 그대로 사용해라
   예: "더 뉴 아이오닉 6", "디 올 뉴 그랜저", "EV3"
4. 현재 판매 중인 모델만 (단종/출시예정 제외)
5. 공식 사이트에 있는 모든 모델을 빠짐없이 포함

\`\`\`json
{
  "brand": "${brand}",
  "categories": [
    {
      "category": "승용",
      "models": [
        { "name": "K3" },
        { "name": "K5" },
        { "name": "K8" },
        { "name": "K9" }
      ]
    },
    {
      "category": "SUV",
      "models": [
        { "name": "셀토스" },
        { "name": "스포티지" }
      ]
    },
    {
      "category": "전기차",
      "models": [
        { "name": "EV3" },
        { "name": "EV6" }
      ]
    }
  ],
  "source": "${site.url}"
}
\`\`\`
위 형식의 JSON만 출력하라. 예시는 기아이므로 실제 "${brand}" 데이터로 바꿔라.
`

  console.log(`🔍 [모델목록] ${brand} — google_search + url_context`)

  // 1차: google_search + url_context
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        tools: [{ google_search: {} }, { url_context: {} }],
      }),
    }
  )

  if (!response.ok) {
    console.warn(`⚠️ [모델목록] url_context 실패, 재시도`)
    return await searchOnly(apiKey, prompt)
  }

  try {
    return parseResponse(await response.json())
  } catch {
    console.warn(`⚠️ [모델목록] 파싱 실패, google_search만 재시도`)
    return await searchOnly(apiKey, prompt)
  }
}

async function searchOnly(apiKey: string, prompt: string) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        tools: [{ google_search: {} }],
      }),
    }
  )
  if (!response.ok) {
    const errText = await response.text()
    throw new Error(`Gemini API Error: ${errText.substring(0, 300)}`)
  }
  return parseResponse(await response.json())
}

function parseResponse(data: any) {
  const parts = data.candidates?.[0]?.content?.parts || []
  const rawText = parts.filter((p: any) => p.text).map((p: any) => p.text).join('\n')
  if (!rawText) throw new Error('AI 응답이 비어있습니다.')

  console.log(`📝 [모델목록] 응답: ${rawText.length}자`)

  const jsonMatch =
    rawText.match(/```json\s*([\s\S]*?)```/) ||
    rawText.match(/```\s*([\s\S]*?)```/) ||
    rawText.match(/(\{[\s\S]*\})/)
  if (!jsonMatch) throw new Error('JSON 추출 실패')

  let jsonStr = jsonMatch[1].trim().replace(/,\s*([}\]])/g, '$1')
  return JSON.parse(jsonStr)
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth.error) return auth.error

  try {
    const { brand } = await request.json()
    if (!brand) {
      return NextResponse.json({ error: '브랜드를 선택해주세요.' }, { status: 400 })
    }

    console.log(`🔍 [모델목록] ${brand} 조회 시작`)
    const result = await fetchBrandModels(brand.trim())
    console.log(`✅ [모델목록] ${result.brand} — ${result.models?.length || 0}개 모델`)

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('❌ [모델목록] 에러:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
