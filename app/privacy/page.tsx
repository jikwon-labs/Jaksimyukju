import Link from "next/link";
import { Article, LegalPage, legalStyles as s } from "@/components/legal/LegalPage";
import { OPERATOR, PROCESSORS, SERVICE_NAME } from "@/lib/legal";

export const metadata = { title: "개인정보 처리방침 · 작심육주" };

// 개인정보 보호법 제30조(처리방침의 수립·공개)와 시행령 제31조의 기재 사항을 차례로 담는다.
// 실제로 저장하는 항목은 prisma/schema.prisma, 외부 업체는 lib/legal.ts의 PROCESSORS와 맞춰야 한다

export default function PrivacyPage() {
  return (
    <LegalPage
      title="개인정보 처리방침"
      intro={
        <p>
          {OPERATOR.name}(이하 &lsquo;운영자&rsquo;)는 {SERVICE_NAME} 웹과 앱(이하
          &lsquo;서비스&rsquo;)을 운영하면서 「개인정보 보호법」을 지키고, 이용자의 개인정보를
          어떻게 처리하는지 아래와 같이 알려 드립니다.
        </p>
      }
    >
      <Article id="p1" title="1. 처리하는 개인정보와 목적">
        <p>서비스는 회원가입 없이 게스트로 시작하며, 아래 정보만 처리합니다.</p>
        <div className={s.tableWrap}>
          <table className={s.table}>
            <thead>
              <tr>
                <th scope="col">구분</th>
                <th scope="col">항목</th>
                <th scope="col">목적</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>게스트 시작(필수)</td>
                <td>
                  자동으로 붙는 별명, 고른 선생님, 학습 요일·시간, 알림 시각, 화면 테마, 로그인
                  유지용 세션 토큰
                </td>
                <td>학습 계획을 만들고 이어서 쓸 수 있게 하기</td>
              </tr>
              <tr>
                <td>학습 기록(필수)</td>
                <td>
                  학습 주제·목표·수준, 레슨 진행과 잔디, 튜터 대화, 퀴즈 답, 마일스톤 글, 주간 회고
                  답과 다짐, 쉬어 가기 사유, &lsquo;이상해요&rsquo; 신고
                </td>
                <td>레슨·퀴즈·피드백 제공, 연속 기록 관리, 잘못된 내용 바로잡기</td>
              </tr>
              <tr>
                <td>계정 연결(선택)</td>
                <td>
                  카카오·Google·Apple 회원번호, 공급자가 확인해 준 이메일(받은 경우만), Apple 연결
                  해제용 토큰
                </td>
                <td>다른 기기에서 같은 기록으로 로그인하기, 탈퇴할 때 연결 끊기</td>
              </tr>
              <tr>
                <td>앱 알림(선택)</td>
                <td>푸시 알림 토큰, 알림 종류별 켜고 끈 설정</td>
                <td>학습 시간·콕 찌르기·주간 회고 알림 보내기</td>
              </tr>
              <tr>
                <td>그룹(필수, 공개 범위는 선택)</td>
                <td>그룹 참여 정보, 공개 범위(잔디만 / 잔디와 주제), 콕 찌르기 기록</td>
                <td>함께 공부하는 사람과 기록 보기, 응원하기</td>
              </tr>
              <tr>
                <td>자동 수집</td>
                <td>접속 IP, 기기·브라우저 정보, 접속 시각(서버 접속 기록)</td>
                <td>서비스 운영, 오류 확인, 부정 이용 막기</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>
          주민등록번호 같은 고유식별정보와 건강 정보 같은 민감정보는 받지 않습니다.
          튜터·회고·마일스톤에 이런 내용을 적지 말아 주세요. 광고를 위한 행태정보는 수집하지 않으며,
          다른 앱·웹사이트에서의 활동을 추적하지 않습니다.
        </p>
      </Article>

      <Article id="p2" title="2. 보유 기간과 파기">
        <ul>
          <li>
            모든 개인정보는 이용자가 계정을 삭제할 때까지 보관하고, 삭제하면 지체 없이 파기합니다.
            법령에 따라 따로 보관해야 하는 정보는 없습니다.
          </li>
          <li>
            서버 접속 기록은 호스팅 업체의 보관 정책에 따른 기간이 지나면 자동으로 지워집니다.
          </li>
          <li>
            계정을 연결하지 않은 게스트가 로그아웃하면 그 기록은 다시 열 수 없습니다. 기록을
            지우려면 로그아웃 전에 설정 &gt; 계정 삭제를 이용하거나, 아래 문의처로 요청해 주세요.
          </li>
          <li>
            파기는 데이터베이스에서 다시 살릴 수 없게 지우는 방법으로 합니다. 종이 문서로는
            개인정보를 남기지 않습니다.
          </li>
        </ul>
      </Article>

      <Article id="p3" title="3. 제3자 제공">
        <p>
          운영자는 이용자의 개인정보를 제3자에게 팔거나 제공하지 않습니다. 법령에 특별한 규정이
          있거나 수사기관이 법령에 따른 절차로 요구하는 경우만 예외입니다.
        </p>
        <p>
          같은 그룹 사람에게는 별명, 고른 선생님, 잔디(학습한 날)가 보이고, 공개 범위를
          &lsquo;잔디와 주제&rsquo;로 고르면 학습 주제도 보입니다. 튜터 대화, 퀴즈 점수, 마일스톤
          글은 어떤 경우에도 다른 사람에게 보이지 않습니다.
        </p>
      </Article>

      <Article id="p4" title="4. 처리 위탁과 국외 이전">
        <p>
          서비스를 운영하려고 아래 업체에 개인정보 처리를 맡기며, 이 업체들은 국외에 있거나 국외에서
          정보를 처리합니다(「개인정보 보호법」 제26조, 제28조의8). 이전을 원하지 않으면 서비스
          이용을 멈추고 계정을 삭제할 수 있습니다. 다만 아래 업체 없이는 서비스를 제공할 수
          없습니다.
        </p>
        <div className={s.tableWrap}>
          <table className={s.table}>
            <thead>
              <tr>
                <th scope="col">받는 곳(국가)</th>
                <th scope="col">맡기는 일</th>
                <th scope="col">이전 항목</th>
                <th scope="col">이전 시기·방법</th>
                <th scope="col">보유 기간</th>
              </tr>
            </thead>
            <tbody>
              {PROCESSORS.map((p) => (
                <tr key={p.name}>
                  <td>
                    {p.name}
                    <br />({p.country})
                  </td>
                  <td>{p.task}</td>
                  <td>{p.items}</td>
                  <td>
                    {p.timing}, {p.method}
                  </td>
                  <td>{p.retention}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>
          외부 AI(Anthropic)로 보내는 정보는 처음 쓰기 전에 따로 안내하고 동의를 받습니다. 동의는
          설정 &gt; 약관과 정책 &gt;{" "}
          <Link href="/ai-consent?from=settings">AI 선생님과 데이터</Link>에서 언제든 철회할 수
          있습니다. 이름·이메일·소셜 계정 정보·푸시 토큰은 AI로 보내지 않습니다.
        </p>
        <p>
          카카오·Google·Apple 로그인은 이용자가 고른 경우에만 해당 회사의 로그인 화면을 거치며,
          운영자는 위 1번의 항목만 받습니다. 읽어 주기의 AI 목소리를 고르면 목소리 파일을 외부
          저장소(Hugging Face, jsDelivr)에서 기기로 받으며, 읽을 글은 기기 안에서만 처리하고 밖으로
          보내지 않습니다.
        </p>
      </Article>

      <Article id="p5" title="5. 이용자의 권리와 행사 방법">
        <ul>
          <li>
            이용자는 언제든 자기 개인정보를 열람하고, 고치고, 지우고, 처리를 멈추라고 요구할 수
            있으며, 동의를 철회할 수 있습니다.
          </li>
          <li>
            학습 설정과 알림은 설정 화면에서 바로 고칠 수 있고, 계정과 모든 기록은 설정 &gt; 계정
            삭제에서 바로 지울 수 있습니다.
          </li>
          <li>
            그 밖의 요구는 아래 문의처로 보내 주세요. 본인인지 확인한 뒤 10일 안에 처리하고 결과를
            알려 드립니다.
          </li>
          <li>법정대리인이나 위임받은 사람을 통해서도 요구할 수 있습니다.</li>
        </ul>
      </Article>

      <Article id="p6" title="6. 기기에 저장하는 정보(쿠키 등)">
        <ul>
          <li>
            쿠키: 로그인 유지(세션), 고른 선생님과 화면 테마, 로그인 진행 확인, AI 안내 동의 여부,
            초대 링크를 저장합니다. 광고·분석용 쿠키는 쓰지 않습니다.
          </li>
          <li>
            브라우저 저장소: 오프라인에서 볼 레슨, 읽어 주기 설정과 목소리 파일, 시작 화면에서 고른
            답(계정을 만들기 전까지)을 저장합니다.
          </li>
          <li>
            브라우저 설정에서 쿠키를 막을 수 있지만, 그러면 로그인을 유지할 수 없어 서비스를 쓰기
            어렵습니다.
          </li>
        </ul>
      </Article>

      <Article id="p7" title="7. 안전하게 지키는 방법">
        <ul>
          <li>
            모든 통신은 암호화(HTTPS)하고, 로그인 세션은 추측할 수 없는 무작위 토큰으로 관리합니다.
          </li>
          <li>
            데이터베이스와 외부 서비스의 비밀 키는 서버 환경 변수로만 다루고, 접근할 수 있는 사람을
            운영자로 한정합니다.
          </li>
          <li>이용자는 자기 기록과 자기 그룹의 공개 정보만 볼 수 있도록 서버에서 확인합니다.</li>
        </ul>
      </Article>

      <Article id="p8" title="8. 만 14세 미만 아동">
        <p>
          서비스는 만 14세 이상을 대상으로 합니다. 만 14세 미만 아동의 개인정보를 알고서 수집하지
          않으며, 알게 되면 바로 삭제합니다.
        </p>
      </Article>

      <Article id="p9" title="9. 개인정보 보호책임자와 문의처">
        <ul>
          <li>개인정보 보호책임자: {OPERATOR.privacyOfficer}</li>
          <li>문의 메일: {OPERATOR.email}</li>
        </ul>
        <p>개인정보 침해에 대한 상담이나 신고는 아래 기관에도 할 수 있습니다.</p>
        <ul>
          <li>개인정보침해신고센터: 국번 없이 118, privacy.kisa.or.kr</li>
          <li>개인정보분쟁조정위원회: 1833-6972, www.kopico.go.kr</li>
          <li>대검찰청: 국번 없이 1301, www.spo.go.kr</li>
          <li>경찰청: 국번 없이 182, ecrm.police.go.kr</li>
        </ul>
      </Article>

      <Article id="p10" title="10. 처리방침의 변경">
        <p>
          이 처리방침을 바꾸면 시행 7일 전부터 서비스 안에서 알립니다. 이용자 권리에 중요한 변경이면
          30일 전부터 알리고, 필요하면 다시 동의를 받습니다.
        </p>
      </Article>
    </LegalPage>
  );
}
