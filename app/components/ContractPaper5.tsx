import React from 'react'

const numberToKorean = (number: number) => {
  if (!number) return ''
  return number.toLocaleString()
}

// signatureUrl: 을(투자자)의 서명 이미지 경로
export default function ContractPaper({ data, car, signatureUrl }: { data: any, car: any, signatureUrl?: string }) {
  const today = new Date()

  return (
    <div className="bg-white text-black py-[10mm] px-[15mm] w-[210mm] min-h-[297mm] mx-auto shadow-xl print:shadow-none print:w-full text-sm leading-relaxed relative" id="printable-area">
      <h1 className="text-2xl font-black text-center mb-6 border-b-2 border-black pb-2">차량 운영 투자 및 수익 배분 계약서</h1>

      {/* 갑/을 정보 */}
      <div className="mb-4 grid grid-cols-2 gap-6 text-xs">
        <div>
           <h3 className="font-bold border-b border-black mb-1">투자자 (이하 '을')</h3>
           <p><span className="font-bold w-16 inline-block">성명/상호:</span> {data.investor_name}</p>
           <p><span className="font-bold w-16 inline-block">연락처:</span> {data.investor_phone}</p>
           <p><span className="font-bold w-16 inline-block">주소:</span> {data.investor_address}</p>
        </div>
        <div>
           <h3 className="font-bold border-b border-black mb-1">운용사 (이하 '갑')</h3>
           <p><span className="font-bold w-16 inline-block">상호:</span> (주)에프엠아이</p>
           <p><span className="font-bold w-16 inline-block">대표이사:</span> 박진숙</p>
           <p><span className="font-bold w-16 inline-block">주소:</span> 경기도 연천군 백동로236번길 190</p>
        </div>
      </div>

      <p className="mb-2 text-justify text-xs">
        '갑'과 '을'은 차량 운영 사업을 위한 투자 및 수익 배분에 관하여 다음과 같이 계약을 체결한다.
      </p>

      {/* 본문 (내용은 그대로 유지) */}
      <div className="space-y-3">
          <div>
              <h2 className="font-bold text-sm mb-1">제1조 (목적)</h2>
              <p className="pl-2 text-justify text-xs tracking-tight">
                본 계약은 '을'이 '갑'의 렌터카 및 모빌리티 사업 확장을 위하여 자금을 투자하고, '갑'은 해당 자금으로 차량을 매입·운용하여 발생한 수익을 '을'에게 배분하는 것을 목적으로 한다.
              </p>
          </div>

          <div>
              <h2 className="font-bold text-sm mb-1">제2조 (투자금의 납입 및 용도)</h2>
              <ol className="list-decimal list-inside pl-2 text-xs space-y-0.5">
                <li>'을'은 <b>일금 {numberToKorean(data.invest_amount)}원 (₩{data.invest_amount?.toLocaleString()})</b>을 '갑'에게 투자금으로 지급한다.</li>
                <li>'갑'은 위 투자금을 <b>[{car?.brand} {car?.model} / {car?.number}]</b> (이하 "본 건 차량")을 구입 및 등록하는 용도로 사용하여야 한다.</li>
              </ol>
          </div>

          <div>
              <h2 className="font-bold text-sm mb-1">제3조 (차량의 소유권 및 관리)</h2>
              <ol className="list-decimal list-inside pl-2 text-xs space-y-0.5">
                <li>"본 건 차량"의 소유권 및 자동차등록원부상 명의는 전적으로 '갑'에게 귀속된다.</li>
                <li>차량의 운영, 배차, 유지보수, 보험 가입 등 운영 전반에 관한 권한과 책임은 '갑'이 수행한다.</li>
                <li>단, 차량 운행 중 발생한 과태료 및 범칙금은 실제 운전자에게 부과함을 원칙으로 하되, 미납으로 인해 '갑'에게 청구될 경우 <b>수익 정산 시 해당 금액을 우선 공제</b>한다.</li>
              </ol>
          </div>

          <div>
              <h2 className="font-bold text-sm mb-1">제4조 (수익의 정산 및 배분)</h2>
              <div className="pl-2 text-xs space-y-1">
                <p>1. <b>[위탁 관리비]</b> '갑'의 관리 대가로 매월 <b>금 {data.admin_fee?.toLocaleString()}원</b>을 매출에서 우선 공제한다.</p>
                <p>2. <b>[수익 배분]</b> 관리비 및 실비(보험,정비 등) 공제 후 잔액을 <b>갑 {100 - data.share_ratio}% : 을 {data.share_ratio}%</b> 비율로 나눈다.</p>
                <p>3. <b>[지급 시기]</b> 매월 말일 정산하여, <b>익월 {data.payout_day}일</b>까지 지급한다.</p>
                <p>4. <b>[자료 공개]</b> '을'의 요청 시 '갑'은 차량의 운행 기록 및 매출/지출 증빙 자료를 성실히 제공해야 한다.</p>
                <p className="text-gray-600 pl-4 mt-1">└ 지급 계좌: {data.bank_name} {data.account_number} (예금주: {data.account_holder})</p>
              </div>
          </div>

          <div>
              <h2 className="font-bold text-sm mb-1">제5조 (세금 처리)</h2>
              <p className="pl-2 text-xs">
                수익금 지급 시 <b>'{data.tax_type}'</b> 방식으로 세무 처리를 진행한다. (관련 법령에 따른 세액 공제 후 지급)
              </p>
          </div>

          <div>
              <h2 className="font-bold text-sm mb-1">제6조 (계약 기간 및 종료)</h2>
              <ol className="list-decimal list-inside pl-2 text-xs space-y-0.5">
                <li>본 계약기간은 <b>{data.contract_start_date} 부터 {data.contract_end_date} 까지</b>(36개월)로 한다.</li>
                <li>계약 만료 시 '갑'은 차량을 <b>공정한 시장 가격(중고차 시세)</b>으로 매각하여, 제반 비용을 제외한 전액을 '을'에게 반환함으로써 투자를 종결한다.</li>
                <li>단, '을'이 희망할 경우 차량을 매각하는 대신 <b>'을' 또는 '을'이 지정한 자에게 소유권을 이전</b>할 수 있다. (취등록세 등 이전 비용은 '을' 부담)</li>
                <li>중고차 시세 하락으로 인한 매각 대금 부족분에 대하여 '을'은 '갑'에게 차액 보전을 청구할 수 없다.</li>
              </ol>
          </div>

          <div>
              <h2 className="font-bold text-sm mb-1">제7조 (중도 해지 및 위약금)</h2>
              <p className="pl-2 text-xs">
                계약 기간 중 일방의 귀책사유 또는 단순 변심으로 계약을 해지할 경우, 귀책 당사자는 상대방에게 <b>위탁 관리비의 3개월분</b>을 위약금으로 배상하여야 한다.
              </p>
          </div>

          <div>
              <h2 className="font-bold text-sm mb-1">제8조 (특약 사항)</h2>
              <p className="pl-2 text-xs min-h-[30px] whitespace-pre-wrap border p-1 rounded bg-gray-50 print:bg-transparent print:border-none">
                {data.memo || "특이사항 없음."}
                {data.mortgage_setup && "\n* 본 차량에 대하여 '을'을 채권자로 하는 근저당권 설정을 진행함. (설정비용: 을 부담)"}
              </p>
          </div>
      </div>

      <div className="mt-8 text-center">
        <p className="mb-4 text-xs">위 계약을 증명하기 위하여 계약서 2통을 작성하여 기명날인 후 각각 1통씩 보관한다.</p>
        <p className="text-lg font-bold mb-8">{today.getFullYear()}년 {today.getMonth() + 1}월 {today.getDate()}일</p>

        <div className="flex justify-between px-8 mt-4 items-end">

            {/* 👇 (갑) 운용사 - 도장 추가됨 */}
            <div className="text-left relative">
                <p className="font-bold text-base mb-2">(갑) 운용사</p>
                <p className="text-xs mb-1">상호: (주)에프엠아이</p>
                <div className="relative">
                    <p className="text-xs z-10 relative">대표이사: 박진숙 (인)</p>
                    {/* public/stamp.png 파일을 불러와서 이름 위에 겹침 */}
                    <img
                        src="/stamp.png"
                        alt="회사직인"
                        className="absolute -top-3 left-16 w-14 h-14 object-contain mix-blend-multiply opacity-90 pointer-events-none"
                    />
                </div>
            </div>

            {/* 👇 (을) 투자자 - 전자 서명 추가됨 */}
            <div className="text-left relative">
                <p className="font-bold text-base mb-2">(을) 투자자</p>
                <div className="relative">
                    <p className="text-xs mb-1">성명/상호: {data.investor_name} (인)</p>
                    {/* 차주 서명 이미지가 있으면 보여줌 */}
                    {signatureUrl && (
                        <img
                            src={signatureUrl}
                            alt="서명"
                            className="absolute -top-4 left-10 w-16 h-10 object-contain mix-blend-multiply"
                        />
                    )}
                </div>
                <p className="text-xs">연락처: {data.investor_phone}</p>
            </div>
        </div>
      </div>
    </div>
  )
}