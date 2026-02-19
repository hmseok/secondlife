import { NextRequest, NextResponse } from 'next/server'

// 롯데렌터카 공식 단기렌트 요금 크롤링 API
// 소스: https://www.lotterentacar.net/hp/kor/reservation/shortInfo/pay.do

interface LotteRateRow {
  lotte_category: string
  vehicle_names: string
  rate_6hrs: number
  rate_10hrs: number
  rate_12hrs: number
  rate_1_3days: number
  rate_4days: number
  rate_5_6days: number
  rate_7plus_days: number
  service_group: string
  sort_order: number
}

export async function POST(request: NextRequest) {
  try {
    const { region = 'inland' } = await request.json().catch(() => ({}))

    // 롯데렌터카 단기렌트 요금 페이지 크롤링
    const url = 'https://www.lotterentacar.net/hp/kor/reservation/shortInfo/pay.do'

    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
      },
      next: { revalidate: 0 },
    })

    if (!res.ok) {
      console.error('❌ 롯데렌터카 페이지 응답 에러:', res.status)
      return NextResponse.json({
        success: false,
        error: `롯데렌터카 페이지 응답 에러: HTTP ${res.status}`,
        fallback: true,
      }, { status: 502 })
    }

    const html = await res.text()
    console.log('📥 롯데렌터카 페이지 HTML 수신:', html.length, 'bytes')

    // HTML에서 요금표 파싱 시도
    const rates = parseRatesFromHtml(html, region)

    if (rates.length === 0) {
      console.warn('⚠️ 요금표 파싱 실패 — HTML 구조가 변경되었을 수 있습니다')
      return NextResponse.json({
        success: false,
        error: '요금표 파싱 실패: 롯데렌터카 페이지 구조가 변경되었을 수 있습니다. 수동 업데이트를 사용해주세요.',
        fallback: true,
      })
    }

    console.log(`✅ 롯데렌터카 요금 ${rates.length}건 파싱 완료`)

    return NextResponse.json({
      success: true,
      data: rates,
      count: rates.length,
      region,
      fetchedAt: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error('❌ 롯데렌터카 요금 크롤링 실패:', error.message)
    return NextResponse.json({
      success: false,
      error: '롯데렌터카 서버에 접속할 수 없습니다: ' + error.message,
      fallback: true,
    }, { status: 500 })
  }
}

// ─── HTML 파싱 함수 ───
function parseRatesFromHtml(html: string, region: string): LotteRateRow[] {
  const rates: LotteRateRow[] = []

  try {
    // 롯데렌터카 페이지는 테이블 형태로 요금을 표시
    // 패턴: <table> 안에 카테고리, 차종, 요금들이 행으로 나열

    // 정규식으로 테이블 행 파싱 시도
    // 롯데 페이지 구조: 카테고리 | 차종 | 6시간 | 10시간 | 24시간(1~3일) | 4일 | 5~6일 | 7일+

    // 가격 패턴 (콤마 포함 숫자)
    const pricePattern = /[\d,]+/g

    // <tr> 태그 안의 <td> 값들 추출
    const trPattern = /<tr[^>]*>([\s\S]*?)<\/tr>/gi
    const tdPattern = /<td[^>]*>([\s\S]*?)<\/td>/gi

    let trMatch
    let sortOrder = 0
    let currentCategory = ''

    while ((trMatch = trPattern.exec(html)) !== null) {
      const trContent = trMatch[1]
      const tds: string[] = []
      let tdMatch

      // td 내용 추출 (HTML 태그 제거)
      const tdRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi
      while ((tdMatch = tdRegex.exec(trContent)) !== null) {
        const text = tdMatch[1].replace(/<[^>]+>/g, '').trim()
        tds.push(text)
      }

      // th도 확인 (카테고리 rowspan 등)
      const thRegex = /<th[^>]*>([\s\S]*?)<\/th>/gi
      let thMatch
      const ths: string[] = []
      while ((thMatch = thRegex.exec(trContent)) !== null) {
        const text = thMatch[1].replace(/<[^>]+>/g, '').trim()
        ths.push(text)
      }

      // 카테고리 업데이트 (th에 카테고리가 있는 경우)
      if (ths.length > 0) {
        const cat = ths[0]
        if (['경차', '소형', '중형', '준대형', '대형', '승합', 'SUV', '수입차', '전기차'].some(c => cat.includes(c))) {
          currentCategory = cat
        }
      }

      // 차종명과 가격이 포함된 행인지 판별
      // 최소 6개 이상의 td가 있고, 숫자(가격)가 포함되어야 함
      if (tds.length >= 6) {
        const prices = tds.filter(td => /^\d{1,3}(,\d{3})*$/.test(td.replace(/\s/g, '')))
        if (prices.length >= 4) {
          sortOrder++
          const vehicleName = tds.find(td => !(/^\d{1,3}(,\d{3})*$/.test(td.replace(/\s/g, ''))) && td.length > 2) || ''
          const priceValues = prices.map(p => parseInt(p.replace(/,/g, ''), 10))

          const category = currentCategory || guessCategory(vehicleName)
          const serviceGroup = guessServiceGroup(category, priceValues[2] || 0) // 1~3일 요금 기준

          rates.push({
            lotte_category: category,
            vehicle_names: vehicleName,
            rate_6hrs: priceValues[0] || 0,
            rate_10hrs: priceValues[1] || 0,
            rate_12hrs: priceValues[2] || Math.round(((priceValues[1] || 0) + (priceValues[3] || 0)) / 2 / 1000) * 1000,
            rate_1_3days: priceValues[3] || priceValues[2] || 0,
            rate_4days: priceValues[4] || priceValues[3] || 0,
            rate_5_6days: priceValues[5] || priceValues[4] || 0,
            rate_7plus_days: priceValues[6] || priceValues[5] || 0,
            service_group: serviceGroup,
            sort_order: sortOrder,
          })
        }
      }
    }
  } catch (e) {
    console.error('파싱 오류:', e)
  }

  return rates
}

// 차종명에서 카테고리 추측
function guessCategory(name: string): string {
  const upper = name.toUpperCase()
  if (['스파크', '모닝', '레이', '캐스퍼'].some(k => name.includes(k))) return '경차'
  if (['아반떼'].some(k => name.includes(k))) return '소형'
  if (['쏘나타', 'K5', 'G70 2.0'].some(k => name.includes(k))) return '중형'
  if (['K8', '그랜저', 'G70 2.5'].some(k => name.includes(k))) return '준대형'
  if (['G80', 'G90', 'K9'].some(k => name.includes(k))) return '대형'
  if (['스타렉스', '스타리아', '카니발', '쏠라티'].some(k => name.includes(k))) return '승합'
  if (['코나', '니로', '셀토스', '스포티지', '투싼'].some(k => name.includes(k))) return 'SUV·RV(소형)'
  if (['쏘렌토', '싼타페', '팰리세이드', 'GV70', 'GV80', '토레스'].some(k => name.includes(k))) return 'SUV·RV(중형)'
  if (['BENZ', 'BMW', 'AUDI', 'MINI', 'JEEP', 'TESLA', 'LEXUS', 'VOLVO', 'RANGE', 'FORD', 'VOLKSWAGEN'].some(k => upper.includes(k))) return '수입차'
  if (['EV', '전기', '아이오닉'].some(k => name.includes(k))) return '전기차'
  return '기타'
}

// 카테고리 + 1~3일 요금 기준으로 정비군 추정
function guessServiceGroup(category: string, rate1_3days: number): string {
  if (category === '경차') return '1군'
  if (category === '소형') return '2군'
  if (category === '중형') return '3군'
  if (category === '준대형') return '4군'
  if (category === '대형') {
    if (rate1_3days <= 510000) return '5군'
    return '6군'
  }
  if (category === '승합') return '9군'
  if (category.includes('SUV') || category.includes('RV')) {
    if (rate1_3days <= 270000) return '8군'
    if (rate1_3days <= 400000) return '9군'
    return '10군'
  }
  if (category === '수입차') return '10군'
  if (category === '전기차') {
    if (rate1_3days <= 220000) return '1군'
    if (rate1_3days <= 260000) return '2군'
    if (rate1_3days <= 360000) return '3군'
    if (rate1_3days <= 460000) return '5군'
    if (rate1_3days <= 540000) return '6군'
    return '10군'
  }
  return '3군' // 기본값
}
