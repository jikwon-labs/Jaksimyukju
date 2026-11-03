// 약관·개인정보 처리방침·AI 안내가 함께 쓰는 사실들. 운영자 정보와 외부 업체가 바뀌면 여기만 고친다.
// 개인정보 보호법 제30조: 처리방침에 보호책임자와 연락처를 적어야 한다

export const SERVICE_NAME = "작심육주";

export const OPERATOR = {
  /** 개인이면 이름, 사업자면 상호 */
  name: "서지권",
  /** 개인정보 보호책임자 */
  privacyOfficer: "서지권",
  /** 문의·권리 행사·탈퇴 문의를 받는 메일 */
  email: "wlrnjs5824@gmail.com",
};

/** 처리방침·약관 시행일 */
export const POLICY_EFFECTIVE_DATE = "2026년 11월 4일";

/** 개인정보 처리를 맡기는 곳(처리위탁)과 국외 이전 */
export const PROCESSORS: {
  name: string;
  country: string;
  task: string;
  items: string;
  timing: string;
  method: string;
  retention: string;
}[] = [
  {
    name: "Anthropic, PBC",
    country: "미국",
    task: "AI 선생님 응답 만들기(커리큘럼, 튜터 대화, 마일스톤 피드백, 주간 회고 카드, 자료 추천)",
    items: "학습 주제·목표·수준·일정, 고른 선생님, 튜터에게 쓴 답, 마일스톤 글, 회고 답",
    timing: "해당 기능을 쓸 때마다",
    method: "암호화된 통신(HTTPS)으로 API 전송",
    retention: "응답을 만든 뒤 Anthropic의 데이터 보관 정책에 따른 기간까지(AI 학습에는 쓰지 않음)",
  },
  {
    name: "Vercel Inc.",
    country: "미국(서비스 실행 지역: 대한민국 서울)",
    task: "서비스 서버 운영(호스팅)과 접속 기록",
    items: "서비스 이용 중 오가는 모든 정보, 접속 IP·기기 정보·접속 기록",
    timing: "서비스를 쓰는 동안",
    method: "암호화된 통신(HTTPS)",
    retention: "회원 탈퇴 또는 위탁 계약 종료 때까지",
  },
  {
    name: "Supabase, Inc.",
    country: "미국(데이터 보관 지역: 대한민국 서울)",
    task: "데이터베이스 보관",
    items: "아래 '처리하는 개인정보'의 모든 항목",
    timing: "서비스를 쓰는 동안",
    method: "암호화된 통신으로 저장",
    retention: "회원 탈퇴 또는 위탁 계약 종료 때까지",
  },
  {
    name: "650 Industries, Inc.(Expo)",
    country: "미국",
    task: "앱 푸시 알림 보내기(Apple·Google 알림 서버로 전달)",
    items: "푸시 알림 토큰, 알림 제목과 내용",
    timing: "알림을 보낼 때",
    method: "암호화된 통신(HTTPS)으로 API 전송",
    retention: "알림 전달 후 Expo의 보관 정책에 따른 기간까지",
  },
];
