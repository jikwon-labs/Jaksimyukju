"use client";

import { Switch } from "@/components/ui";
import { koreanVoices, pickVoice, rateLabel, SPEECH_RATES, voiceLabel, type SpeechPrefs } from "@/lib/domain/speech";
import { megabytes, SUPERTONIC_TOTAL_BYTES, SUPERTONIC_VOICES, supertonicVoiceLabel } from "@/lib/domain/supertonic";
import { saveSpeechPrefs, speak, stop, usePlaying, useSpeechPrefs, useSpeechSupported, useVoices } from "./speech";
import { useState } from "react";
import { downloadHq, onMeteredConnection, removeHq, useHqState, type HqState } from "./supertonic";
import s from "./speech.module.css";

const SAMPLE = "안녕하세요. 오늘 레슨도 이 목소리로 읽어 드릴게요.";
const PREVIEW_ID = "settings-preview";

type Classes = {
  card: string;
  pad: string;
  block: string;
  blockLabel: string;
  caption: string;
  seg: string;
  segs: string;
  voice: string;
  divider: string;
  note: string;
  preview: string;
};

function DeviceVoices({ prefs, c }: { prefs: SpeechPrefs; c: Classes }) {
  const voices = koreanVoices(useVoices());
  const current = pickVoice(voices, prefs.voice);
  return (
    <>
      {voices.length === 0 ? (
        <span className={c.caption}>이 기기에 한국어 목소리가 없어요. 기기 기본 목소리로 읽어요.</span>
      ) : (
        <div role="radiogroup" aria-label="기기 목소리" className={c.voice} data-testid="speech-voices">
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
    </>
  );
}

function HqDownload({ hq, c }: { hq: Exclude<HqState, { kind: "ready" | "downloading" | "unsupported" }>; c: Classes }) {
  // 모바일 데이터로 연결돼 있으면 한 번 더 묻는다
  const [confirm, setConfirm] = useState(false);
  const size = megabytes(SUPERTONIC_TOTAL_BYTES);
  if (confirm) {
    return (
      <div role="alert" className={s.confirmBox} data-testid="hq-metered">
        <span className={c.caption}>모바일 데이터로 연결된 것 같아요. {size}를 받으면 데이터가 많이 나가요. Wi-Fi에서 받는 걸 권해요.</span>
        <div className={s.confirmRow}>
          <button
            type="button"
            className={c.preview}
            onClick={() => {
              setConfirm(false);
              void downloadHq();
            }}
            data-testid="hq-metered-ok"
          >
            그래도 받기
          </button>
          <button type="button" className={s.textBtn} onClick={() => setConfirm(false)} data-testid="hq-metered-cancel">
            나중에 받기
          </button>
        </div>
      </div>
    );
  }
  return (
    <>
      {hq.kind === "error" && (
        <span role="alert" className={s.warn}>
          {hq.message}
        </span>
      )}
      <span className={c.caption}>
        처음 한 번 {size}를 내려받아요. Wi-Fi에서 받아 주세요. 받은 뒤에는 연결 없이도 이 휴대폰 안에서 읽어요.
      </span>
      <button
        type="button"
        className={c.preview}
        onClick={() => (onMeteredConnection() ? setConfirm(true) : void downloadHq())}
        data-testid="hq-download"
      >
        {hq.kind === "error" ? "다시 내려받기" : `내려받기 (${size})`}
      </button>
    </>
  );
}

function HqVoices({ prefs, hq, c }: { prefs: SpeechPrefs; hq: HqState; c: Classes }) {
  if (hq.kind === "unsupported") {
    return <span className={c.caption}>이 브라우저에서는 고품질 목소리를 쓸 수 없어요. 기기 목소리로 읽어요.</span>;
  }
  if (hq.kind === "downloading") {
    const pct = Math.floor((hq.loaded / hq.total) * 100);
    return (
      <div className={s.progressBox} data-testid="hq-progress">
        <div role="progressbar" aria-label="고품질 목소리 내려받는 중" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} className={s.progress}>
          <span style={{ width: `${pct}%` }} />
        </div>
        <span className={c.caption}>
          {megabytes(hq.loaded)} / {megabytes(hq.total)} · 이 화면을 닫지 말아 주세요
        </span>
      </div>
    );
  }
  if (hq.kind !== "ready") {
    return <HqDownload hq={hq} c={c} />;
  }
  return (
    <>
      <div role="radiogroup" aria-label="고품질 목소리" className={s.hqVoices} data-testid="hq-voices">
        {SUPERTONIC_VOICES.map((v) => (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={prefs.hqVoice === v}
            className={c.seg}
            onClick={() => {
              saveSpeechPrefs({ hqVoice: v });
              speak(PREVIEW_ID, SAMPLE, { ...prefs, hqVoice: v });
            }}
          >
            {supertonicVoiceLabel(v)}
          </button>
        ))}
      </div>
      <span className={c.caption}>AI가 만든 목소리예요(슈퍼톤 Supertonic 2). 처음 읽을 때 몇 초 준비해요.</span>
      {hq.persisted === false && (
        <span className={c.caption} data-testid="hq-not-persisted">
          휴대폰 저장공간이 모자라면 브라우저가 받은 목소리를 지울 수 있어요. 그러면 기기 목소리로 읽고, 여기서 다시 받을 수 있어요.
        </span>
      )}
      <button
        type="button"
        className={s.textBtn}
        onClick={() => {
          saveSpeechPrefs({ engine: "device" });
          void removeHq();
        }}
        data-testid="hq-remove"
      >
        받은 목소리 지우기 ({megabytes(SUPERTONIC_TOTAL_BYTES)} 비우기)
      </button>
    </>
  );
}

/** 이 기기의 목소리와 속도를 고른다. 설정 화면의 카드 모양은 부모가 classes로 넘긴다 */
export function SpeechSettings({ classes: c }: { classes: Classes }) {
  const device = useSpeechSupported();
  const prefs = useSpeechPrefs();
  const hq = useHqState();
  const playing = usePlaying() === PREVIEW_ID;
  const hqUsable = hq.kind !== "unsupported" && hq.kind !== "unknown";

  if (!device && !hqUsable) {
    return <p className={c.note}>이 기기에서는 읽어 주기를 쓸 수 없어요.</p>;
  }

  // 기기 목소리가 없는 브라우저는 고품질 목소리만 고를 수 있다
  const engine = device ? prefs.engine : "hq";
  const canPreview = engine === "device" || hq.kind === "ready";

  return (
    <>
      <div className={c.card}>
        <Switch label="레슨 읽어 주기" sub="레슨과 선생님 말 옆에 듣기 버튼이 생겨요" on={prefs.on} onChange={(on) => saveSpeechPrefs({ on })} />
        {prefs.on && (
          <>
            <div className={c.divider} />
            <div className={`${c.pad} ${c.block}`}>
              <span className={c.blockLabel}>목소리</span>
              {device && hqUsable && (
                <div role="radiogroup" aria-label="목소리 종류" className={s.engines} data-testid="speech-engine">
                  <button type="button" role="radio" aria-checked={engine === "device"} className={c.seg} onClick={() => saveSpeechPrefs({ engine: "device" })}>
                    기기 목소리
                  </button>
                  <button type="button" role="radio" aria-checked={engine === "hq"} className={c.seg} onClick={() => saveSpeechPrefs({ engine: "hq" })}>
                    고품질 목소리
                  </button>
                </div>
              )}
              {engine === "device" ? <DeviceVoices prefs={prefs} c={c} /> : <HqVoices prefs={prefs} hq={hq} c={c} />}
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
              {canPreview && (
                <button
                  type="button"
                  className={c.preview}
                  aria-pressed={playing}
                  onClick={() => (playing ? stop() : speak(PREVIEW_ID, SAMPLE, { ...prefs, engine }))}
                  data-testid="speech-preview"
                >
                  {playing ? "멈추기" : "미리 듣기"}
                </button>
              )}
            </div>
          </>
        )}
      </div>
      <p className={c.note}>이 휴대폰에만 저장돼요</p>
    </>
  );
}
