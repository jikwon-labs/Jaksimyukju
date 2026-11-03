"use client";

import { Switch } from "@/components/ui";
import { koreanVoices, pickVoice, rateLabel, SPEECH_RATES, voiceLabel } from "@/lib/domain/speech";
import { saveSpeechPrefs, speak, stop, usePlaying, useSpeechPrefs, useSpeechSupported, useVoices } from "./speech";

const SAMPLE = "안녕하세요. 오늘 레슨도 이 목소리로 읽어 드릴게요.";
const PREVIEW_ID = "settings-preview";

/** 이 기기의 목소리와 속도를 고른다. 설정 화면의 카드 모양은 부모가 classes로 넘긴다 */
export function SpeechSettings({
  classes: c,
}: {
  classes: { card: string; pad: string; block: string; blockLabel: string; caption: string; seg: string; segs: string; voice: string; divider: string; note: string; preview: string };
}) {
  const ok = useSpeechSupported();
  const prefs = useSpeechPrefs();
  const voices = koreanVoices(useVoices());
  const playing = usePlaying() === PREVIEW_ID;

  if (!ok) {
    return <p className={c.note}>이 기기에서는 읽어 주기를 쓸 수 없어요.</p>;
  }

  const current = pickVoice(voices, prefs.voice);

  return (
    <>
      <div className={c.card}>
        <Switch label="레슨 읽어 주기" sub="레슨과 선생님 말 옆에 듣기 버튼이 생겨요" on={prefs.on} onChange={(on) => saveSpeechPrefs({ on })} />
        {prefs.on && (
          <>
            <div className={c.divider} />
            <div className={`${c.pad} ${c.block}`}>
              <span className={c.blockLabel}>목소리</span>
              {voices.length === 0 ? (
                <span className={c.caption}>이 기기에 한국어 목소리가 없어요. 기기 기본 목소리로 읽어요.</span>
              ) : (
                <div role="radiogroup" aria-label="목소리" className={c.voice} data-testid="speech-voices">
                  {voices.map((v) => (
                    <button
                      key={v.voiceURI}
                      type="button"
                      role="radio"
                      aria-checked={current?.voiceURI === v.voiceURI}
                      className={c.seg}
                      onClick={() => {
                        saveSpeechPrefs({ voice: v.voiceURI });
                        speak(PREVIEW_ID, SAMPLE, { ...prefs, voice: v.voiceURI });
                      }}
                    >
                      {voiceLabel(v)}
                    </button>
                  ))}
                </div>
              )}
              <span className={c.caption}>목소리는 휴대폰마다 달라요. iPhone은 설정 &gt; 손쉬운 사용 &gt; 읽기 및 말하기에서 더 자연스러운 목소리를 받을 수 있어요.</span>
            </div>
            <div className={c.divider} />
            <div className={`${c.pad} ${c.block}`}>
              <span className={c.blockLabel}>읽는 속도</span>
              <div role="radiogroup" aria-label="읽는 속도" className={c.segs} data-testid="speech-rates">
                {SPEECH_RATES.map((r) => (
                  <button key={r} type="button" role="radio" aria-checked={prefs.rate === r} className={c.seg} onClick={() => saveSpeechPrefs({ rate: r })}>
                    {rateLabel(r)}
                  </button>
                ))}
              </div>
              <button
                type="button"
                className={c.preview}
                aria-pressed={playing}
                onClick={() => (playing ? stop() : speak(PREVIEW_ID, SAMPLE, prefs))}
                data-testid="speech-preview"
              >
                {playing ? "멈추기" : "미리 듣기"}
              </button>
            </div>
          </>
        )}
      </div>
      <p className={c.note}>이 휴대폰에만 저장돼요</p>
    </>
  );
}
