import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '../../utils/auth-guard'

/**
 * NHTSA VIN Decoder API Proxy
 * 차대번호(VIN)로 차량 정보 조회 (무료, 키 불필요)
 *
 * 사용: GET /api/vin-decode?vin=KMHD35LH5GU000001
 */
export async function GET(req: NextRequest) {
    const auth = await requireAuth(req)
    if (auth.error) return auth.error

    const vin = req.nextUrl.searchParams.get('vin')
    if (!vin || vin.length < 11) {
        return NextResponse.json({ error: 'VIN은 최소 11자 이상이어야 합니다.' }, { status: 400 })
    }

    try {
        const res = await fetch(
            `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/${encodeURIComponent(vin)}?format=json`,
            { next: { revalidate: 86400 } } // 24시간 캐시
        )

        if (!res.ok) throw new Error(`NHTSA API 응답 오류: ${res.status}`)

        const data = await res.json()
        const r = data?.Results?.[0]

        if (!r) throw new Error('결과 없음')

        // 필요한 필드만 추출
        const result = {
            make: r.Make || '',                     // 제조사 (HYUNDAI, KIA 등)
            model: r.Model || '',                   // 모델명
            year: r.ModelYear || '',                 // 연식
            trim: r.Trim || '',                     // 트림
            body_class: r.BodyClass || '',           // 차체 유형
            fuel_type: r.FuelTypePrimary || '',      // 연료 타입
            displacement: r.DisplacementL || '',     // 배기량 (L)
            cylinders: r.EngineCylinders || '',      // 실린더 수
            drive_type: r.DriveType || '',           // 구동 방식
            doors: r.Doors || '',                   // 문 수
            plant_country: r.PlantCountry || '',     // 생산 국가
            vehicle_type: r.VehicleType || '',       // 차량 유형
            gvwr: r.GVWR || '',                     // 총중량
            error_code: r.ErrorCode || '',           // 에러코드 (0=성공)
            error_text: r.ErrorText || '',           // 에러 상세
        }

        return NextResponse.json(result)
    } catch (error: any) {
        console.error('VIN Decode 에러:', error.message)
        return NextResponse.json({ error: error.message || 'VIN 조회 실패' }, { status: 500 })
    }
}
