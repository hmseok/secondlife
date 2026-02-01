import React from 'react'

const numberToKorean = (number: number) => {
  if (!number) return ''
  return number.toLocaleString()
}

export default function ContractPaper({ data, car }: { data: any, car: any }) {
  const today = new Date()

  return (
    // 👇 padding을 p-[20mm] -> py-[15mm] px-[20mm]로 조정하여 위아래 공간 확보
    <div className="bg-white text-black py-[15mm] px-[20mm] w-[210mm] min-h-[297mm] mx-auto shadow-xl print:shadow-none print:w-full text-sm leading-relaxed" id="printable-area">
      <h1 className="text-2xl font-black text-center mb-8 border-b-2 border-black pb-4">차량 운영 투자 및 수익 배분 계약서</h1>

      {/* 갑/을 정보 */}
      <div className="mb-6 grid grid-cols-2 gap-8">
        <div>
           <h3 className="font-bold border-b border-black mb-2">투자자 (이하 '을')</h3>
           <p><span className="font-bold w-20 inline-block">성명(상호):</span> {data.investor_name}</p>
           <p><span className="font-bold w-20 inline-block">연락처:</span> {data.investor_phone}</p>
           <p><span className="font-bold w-20 inline-block">주소:</span> {data.investor_address}</p>
        </div>
        <div>
           <h3 className="font-bold border-b border-black mb-2">운용사 (이하 '갑')</h3>
           <p><span className="font-bold w-20 inline-block">상호:</span> (주)에프엠아이</p>
           <p><span className="font-bold w-20 inline-block">대표이사:</span> 박진숙</p>
           <p><span className="font-bold w-20 inline-block">주소:</span> 경기도 연천군 백동로236번길 190</p>
        </div>
      </div>

      <p className="mb-4 text-justify">
        '갑'과 '을'은 차량 운영 사업을 위한 투자 및 수익 배분에 관하여 다음과 같이 계약을 체결한다.
      </p>

      <h2 className="font-bold text-base mt-4 mb-1">제1조 (목적)</h2>
      <p className="pl-4 mb-2 text-justify text-xs text-gray-800">
        본 계약은 '을'이 '갑'의 렌터카 및 모빌리티 사업 확장을 위하여 자금을 투자하고, '갑'은 해당 자금으로 차량을 매입·운용하여 발생한 수익을 '을'에게 배분하는 것을 목적으로 한다.
      </p>

      <h2 className="font-bold text-base mt-4 mb-1">제2조 (투자금의 납입 및 용도)</h2>
      <ol className="list-decimal list-inside pl-4 mb-2 space-y-1 text-xs">
        <li>'을'은 <b>일금 {numberToKorean(data.invest_amount)}원 (₩{data.invest_amount?.toLocaleString()})</b>을 '갑'에게 투자금으로 지급한다.</li>
        <li>'갑'은 위 투자금을 <b>[{car?.brand} {car?.model} / 차량번호: {car?.number}]</b> (이하 "본 건 차량")을 구입 및 등록하는 용도로 사용하여야 한다.</li>
      </ol>

      <h2 className="font-bold text-base mt-4 mb-1">제3조 (차량의 소유권 및 관리)</h2>
      <ol className="list-decimal list-inside pl-4 mb-2 space-y-1 text-xs">
        <li>"본 건 차량"의 소유권 및 자동차등록원부상 명의는 전적으로 '갑'에게 귀속된다.</li>
        <li>운영, 배차, 유지보수 등 전반적 권한은 '갑'에게 있다.</li>
      </ol>

      <h2 className="font-bold text-base mt-4 mb-1">제4조 (수익의 정산 및 배분)</h2>
      <div className="pl-4 mb-2 space-y-1 text-xs">
        <p><b>1. [위탁 관리비]</b> '갑'의 관리 대가로 매월 <b>금 {data.admin_fee?.toLocaleString()}원</b>을 우선 공제한다.</p>
        <p><b>2. [수익 배분]</b> 관리비 공제 후 잔액을 <b>갑 {100 - data.share_ratio}% : 을 {data.share_ratio}%</b> 비율로 나눈다.</p>
        <p><b>3. [지급 시기]</b> 매월 말일 정산하여, <b>익월 {data.payout_day}일</b>까지 지급한다.</p>
        <p className="text-gray-600">└ 지급 계좌: {data.bank_name} {data.account_number} (예금주: {data.account_holder})</p>
      </div>

      <h2 className="font-bold text-base mt-4 mb-1">제5조 (세금 처리)</h2>
      <p className="pl-4 mb-2 text-xs">
        수익금 지급 시 <b>'{data.tax_type}'</b> 방식으로 세무 처리를 진행한다. (원천징수 시 관련 세액 공제 후 지급)
      </p>

      <h2 className="font-bold text-base mt-4 mb-1">제6조 (계약 기간)</h2>
      <p className="pl-4 mb-2 text-xs">
        본 계약기간은 <b>{data.contract_start_date} 부터 {data.contract_end_date} 까지</b>로 한다.
      </p>

      <h2 className="font-bold text-base mt-4 mb-1">제7조 (특약 사항)</h2>
      <p className="pl-4 mb-2 min-h-[40px] whitespace-pre-wrap border p-2 rounded bg-gray-50 print:bg-transparent print:border-none text-xs">
        {data.memo || "특이사항 없음."}
        {data.mortgage_setup && "\n* 본 차량에 대하여 근저당권 설정을 진행함."}
      </p>

      <div className="mt-12 text-center">
        <p className="mb-6 text-sm">위 계약을 증명하기 위하여 계약서 2통을 작성하여 기명날인 후 보관한다.</p>
        <p className="text-xl font-bold mb-10">{today.getFullYear()}년 {today.getMonth() + 1}월 {today.getDate()}일</p>

        <div className="flex justify-between px-10 mt-8">
            <div className="text-left">
                <p className="font-bold text-lg mb-2">(갑) 운용사</p>
                <p>상호: (주)에프엠아이</p>
                <p>대표이사: 박진숙 (인)</p>
            </div>
            <div className="text-left">
                <p className="font-bold text-lg mb-2">(을) 투자자</p>
                <p>성명: {data.investor_name} (인)</p>
                <p>연락처: {data.investor_phone}</p>
            </div>
        </div>
      </div>
    </div>
  )
}