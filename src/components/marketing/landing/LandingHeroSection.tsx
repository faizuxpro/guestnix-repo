"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { CSSProperties, PointerEvent } from "react";
import { ArrowRight, Check } from "lucide-react";

const trustItems = [
  "Setup in under 10 minutes",
  "No app download for guests",
  "Works on every device",
] as const;

const DEMO_URL = "/demo/sunset-template";

const heroMessagePairs = [
  {
    question: "What's the WiFi password?",
    answer: 'The password is "SeasideStay2024".',
  },
  {
    question: "How do I check in?",
    answer: "Your self check-in guide is ready.",
  },
  {
    question: "Where should we park?",
    answer: "Use spot #4 directly behind the building.",
  },
  {
    question: "Can we get an early check-in?",
    answer: "I checked the guide. Early check-in opens at 1 PM today.",
  },
  {
    question: "Where is the nearest grocery store?",
    answer: "Harbor Market is 6 minutes away and open until 10 PM.",
  },
  {
    question: "How do we use the hot tub?",
    answer: "Open Amenities in the guide for the temperature and safety steps.",
  },
] as const;

type ChatPhase = "idle" | "typing" | "erasing";
type BubbleGroup = "primary" | "secondary";
type HeroMotion = Record<
  | "hostX"
  | "hostY"
  | "botX"
  | "botY"
  | "qX"
  | "qY"
  | "aX"
  | "aY"
  | "sqX"
  | "sqY"
  | "saX"
  | "saY",
  number
>;

const HERO_IDLE_MS = 1800;
const HERO_TYPE_MS = 3300;
const HERO_ERASE_MS = 980;
const HERO_MOTION_EASE = 0.12;
const HERO_MOTION_REST_DELTA = 0.04;

const heroMotionCssVars: Record<keyof HeroMotion, string> = {
  hostX: "--hero-host-x",
  hostY: "--hero-host-y",
  botX: "--hero-bot-x",
  botY: "--hero-bot-y",
  qX: "--hero-q-x",
  qY: "--hero-q-y",
  aX: "--hero-a-x",
  aY: "--hero-a-y",
  sqX: "--hero-sq-x",
  sqY: "--hero-sq-y",
  saX: "--hero-sa-x",
  saY: "--hero-sa-y",
};

function createZeroHeroMotion(): HeroMotion {
  return {
    hostX: 0,
    hostY: 0,
    botX: 0,
    botY: 0,
    qX: 0,
    qY: 0,
    aX: 0,
    aY: 0,
    sqX: 0,
    sqY: 0,
    saX: 0,
    saY: 0,
  };
}

function getRandomPairIndex(previous: readonly number[] = []) {
  const pool = heroMessagePairs
    .map((_, index) => index)
    .sort(() => Math.random() - 0.5);

  return pool.find((index) => !previous.includes(index)) ?? pool[0] ?? 0;
}

export function LandingHeroSection() {
  const visualRef = useRef<HTMLDivElement | null>(null);
  const heroVideoRef = useRef<HTMLVideoElement | null>(null);
  const motionFrameRef = useRef<number | null>(null);
  const motionCurrentRef = useRef<HeroMotion>(createZeroHeroMotion());
  const motionTargetRef = useRef<HeroMotion>(createZeroHeroMotion());
  const [primaryPairIndex, setPrimaryPairIndex] = useState(0);
  const [secondaryPairIndex, setSecondaryPairIndex] = useState(1);
  const [activeGroup, setActiveGroup] = useState<BubbleGroup>("primary");
  const [chatPhase, setChatPhase] = useState<ChatPhase>("typing");
  const primaryPair = heroMessagePairs[primaryPairIndex] ?? heroMessagePairs[0];
  const secondaryPair = heroMessagePairs[secondaryPairIndex] ?? heroMessagePairs[1];

  useEffect(() => {
    const timeout = window.setTimeout(
      () => {
        if (chatPhase === "typing") {
          setChatPhase("idle");
          setActiveGroup((current) =>
            current === "primary" ? "secondary" : "primary"
          );
          return;
        }

        if (chatPhase === "idle") {
          setChatPhase("erasing");
          return;
        }

        if (activeGroup === "primary") {
          setPrimaryPairIndex((current) =>
            getRandomPairIndex([current, secondaryPairIndex])
          );
        } else {
          setSecondaryPairIndex((current) =>
            getRandomPairIndex([current, primaryPairIndex])
          );
        }

        setChatPhase("typing");
      },
      chatPhase === "typing"
        ? HERO_TYPE_MS
        : chatPhase === "erasing"
          ? HERO_ERASE_MS
          : HERO_IDLE_MS
    );

    return () => {
      window.clearTimeout(timeout);
    };
  }, [activeGroup, chatPhase, primaryPairIndex, secondaryPairIndex]);

  useEffect(() => {
    return () => {
      if (motionFrameRef.current !== null) {
        window.cancelAnimationFrame(motionFrameRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const video = heroVideoRef.current;

    if (!video) {
      return;
    }

    let lastTime = -1;
    let stalledChecks = 0;

    const playVideo = () => {
      if (document.visibilityState === "hidden") {
        return;
      }

      video.muted = true;
      video.playsInline = true;
      void video.play().catch(() => {
        // Muted autoplay can still be deferred by the browser. The next
        // visibility/focus/media event will retry.
      });
    };

    const recoverPlayback = () => {
      if (document.visibilityState === "hidden") {
        return;
      }

      if (video.ended) {
        video.currentTime = 0;
        playVideo();
        return;
      }

      if (video.paused) {
        playVideo();
        return;
      }

      if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
        return;
      }

      const currentTime = video.currentTime;

      if (Math.abs(currentTime - lastTime) < 0.01) {
        stalledChecks += 1;
      } else {
        stalledChecks = 0;
      }

      if (stalledChecks >= 2) {
        const duration = Number.isFinite(video.duration) ? video.duration : 0;
        video.currentTime =
          duration > 0 ? (currentTime + 0.08) % duration : currentTime + 0.08;
        stalledChecks = 0;
        playVideo();
      }

      lastTime = video.currentTime;
    };

    const interval = window.setInterval(recoverPlayback, 1200);

    playVideo();
    video.addEventListener("loadeddata", playVideo);
    video.addEventListener("canplay", playVideo);
    video.addEventListener("ended", recoverPlayback);
    video.addEventListener("stalled", recoverPlayback);
    video.addEventListener("suspend", recoverPlayback);
    document.addEventListener("visibilitychange", playVideo);
    window.addEventListener("focus", playVideo);
    window.addEventListener("pageshow", playVideo);

    return () => {
      window.clearInterval(interval);
      video.removeEventListener("loadeddata", playVideo);
      video.removeEventListener("canplay", playVideo);
      video.removeEventListener("ended", recoverPlayback);
      video.removeEventListener("stalled", recoverPlayback);
      video.removeEventListener("suspend", recoverPlayback);
      document.removeEventListener("visibilitychange", playVideo);
      window.removeEventListener("focus", playVideo);
      window.removeEventListener("pageshow", playVideo);
    };
  }, []);

  const messageStyle = (text: string) =>
    ({
      "--message-chars": text.length,
    }) as CSSProperties;

  const writeHeroMotion = (motion: HeroMotion) => {
    const element = visualRef.current;

    if (!element) {
      return;
    }

    Object.entries(heroMotionCssVars).forEach(([key, property]) => {
      element.style.setProperty(
        property,
        `${motion[key as keyof HeroMotion].toFixed(2)}px`
      );
    });
  };

  const startHeroMotionAnimation = () => {
    if (motionFrameRef.current !== null) {
      return;
    }

    const tick = () => {
      const current = motionCurrentRef.current;
      const target = motionTargetRef.current;
      const next = { ...current };
      let isResting = true;

      (Object.keys(current) as Array<keyof HeroMotion>).forEach((key) => {
        const delta = target[key] - current[key];

        if (Math.abs(delta) > HERO_MOTION_REST_DELTA) {
          isResting = false;
          next[key] = current[key] + delta * HERO_MOTION_EASE;
        } else {
          next[key] = target[key];
        }
      });

      motionCurrentRef.current = next;
      writeHeroMotion(next);

      if (isResting) {
        motionFrameRef.current = null;
        return;
      }

      motionFrameRef.current = window.requestAnimationFrame(tick);
    };

    motionFrameRef.current = window.requestAnimationFrame(tick);
  };

  const handleHeroPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
    const y = ((event.clientY - rect.top) / rect.height - 0.5) * 2;

    motionTargetRef.current = {
      hostX: -x * 3.5,
      hostY: -y * 2.8,
      botX: x * 12,
      botY: y * 9,
      qX: x * 6,
      qY: y * 4.5,
      aX: -x * 7,
      aY: -y * 5.5,
      sqX: x * 7.5,
      sqY: -y * 5,
      saX: -x * 5.5,
      saY: y * 6.5,
    };
    startHeroMotionAnimation();
  };

  const handleHeroPointerLeave = () => {
    motionTargetRef.current = createZeroHeroMotion();
    startHeroMotionAnimation();
  };

  const primaryClass =
    activeGroup === "primary" && chatPhase !== "idle"
      ? `typing is-${chatPhase}`
      : "";
  const secondaryClass =
    activeGroup === "secondary" && chatPhase !== "idle"
      ? `typing is-${chatPhase}`
      : "";

  return (
    <section className="landing-hero-section">
      <div
        className="landing-hero landing-hero-split"
        onPointerMove={handleHeroPointerMove}
        onPointerLeave={handleHeroPointerLeave}
      >
        <div className="landing-hero-copycol">
          <h1 data-reveal>
            Modern guest experience,<span>beautifully</span>{" "}
            <span>organized</span>.
          </h1>
          <div className="landing-hero-actions" data-reveal data-delay="2">
            <Link href="/signup" className="landing-btn landing-btn-primary">
              Start Your Free Trial
              <ArrowRight size={18} aria-hidden />
            </Link>
            <Link href={DEMO_URL} className="landing-btn landing-btn-ghost">
              See a Live Demo
            </Link>
          </div>
          <div className="landing-trust-row" data-reveal data-delay="3">
            {trustItems.map((item) => (
              <span key={item} className="landing-trust-item">
                <span aria-hidden>
                  <Check size={12} />
                </span>
                {item}
              </span>
            ))}
          </div>
        </div>

        <div
          id="demo"
          className="landing-hero-visual"
          data-reveal
          data-delay="2"
          aria-label="AI concierge answering guest questions over a host scene"
        >
          <div
            ref={visualRef}
            className="hero-image-shell"
          >
            <Image
              src="/marketing/hero-host-lounge.png"
              alt="Vacation rental host relaxing on a balcony overlooking the coast"
              fill
              priority
              sizes="(max-width: 900px) 100vw, 52vw"
              className="hero-host-image"
              unoptimized
            />
            <div className="hero-image-shade" aria-hidden />
            <div className="hero-bot-orbit" aria-hidden>
              <div className="hero-bot">
                <video
                  ref={heroVideoRef}
                  className="hero-bot-video"
                  autoPlay
                  loop
                  muted
                  playsInline
                  preload="metadata"
                  aria-hidden="true"
                >
                  <source src="/marketing/hero-chatbot-motion.webm" type="video/webm" />
                </video>
              </div>
            </div>
            <div
              className={`hero-message guest hero-message-question ${primaryClass}`}
              style={messageStyle(primaryPair.question)}
            >
              <span className="hero-message-label">Guest</span>
              <span className="hero-message-text">{primaryPair.question}</span>
            </div>
            <div
              className={`hero-message ai hero-message-answer-support ${secondaryClass}`}
              style={messageStyle(secondaryPair.answer)}
            >
              <span className="hero-message-label">AI Concierge</span>
              <span className="hero-message-text">{secondaryPair.answer}</span>
            </div>
            <div
              className={`hero-message guest hero-message-question-support ${secondaryClass}`}
              style={messageStyle(secondaryPair.question)}
            >
              <span className="hero-message-label">Guest</span>
              <span className="hero-message-text">{secondaryPair.question}</span>
            </div>
            <div
              className={`hero-message ai hero-message-answer ${primaryClass}`}
              style={messageStyle(primaryPair.answer)}
            >
              <span className="hero-message-label">AI Concierge</span>
              <span className="hero-message-text">{primaryPair.answer}</span>
            </div>
          </div>
        </div>

        <p className="landing-hero-copy landing-hero-copy-strip" data-reveal data-delay="3">
          Transform property information into a beautifully branded guest
          experience. Reduce guest questions, save hours every week, and deliver
          a more seamless stay with a digital guidebook and AI concierge working
          for you 24/7, so you spend less time supporting and more time hosting.
        </p>
      </div>
    </section>
  );
}
