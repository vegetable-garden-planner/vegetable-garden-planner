"use client";

import { useEffect, useId, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  homeQuickActions,
  searchHome,
  type HomeQuickAction,
  type HomeSearchHit,
  type HomeSearchInput,
} from "@/features/home/domain/home-search";
import styles from "./home-search-bar.module.css";

const KIND_LABELS: Record<HomeSearchHit["kind"], string> = {
  plan: "재배 계획",
  space: "재배 공간",
  crop: "작물 가이드",
};

/**
 * 홈 상단 찾기 바
 *
 * 이미 홈이 불러온 데이터(내 계획 · 내 공간 · 작물 도감) 안에서 찾아 그 화면으로 이동한다.
 * 서버를 새로 부르지 않으므로 입력하는 동안 바로 결과가 나온다.
 *
 * 자연어 질문에 답하는 기능은 아직 붙어 있지 않다. 그래서 여기서는
 * 답하는 척하지 않고 "찾아서 이동"만 하고, 아래 칩도 실제 화면으로만 연결한다.
 */
export function HomeSearchBar({
  input,
  quickActions,
}: {
  input: HomeSearchInput;
  quickActions: HomeQuickAction[];
}) {
  const router = useRouter();
  const listId = useId();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);

  const hits = query.trim() === "" ? [] : searchHome(query, input);
  const showPanel = open && query.trim() !== "";
  const active = hits.length === 0 ? -1 : Math.min(cursor, hits.length - 1);

  useEffect(() => {
    if (!showPanel) return;
    function onPointerDown(event: PointerEvent) {
      const root = rootRef.current;
      if (root && !root.contains(event.target as Node)) setOpen(false);
    }
    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, [showPanel]);

  function handleChange(value: string) {
    setQuery(value);
    setCursor(0);
    setOpen(true);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      setOpen(false);
      return;
    }
    if (hits.length === 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setCursor((current) => (current + 1) % hits.length);
      setOpen(true);
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setCursor((current) => (current - 1 + hits.length) % hits.length);
      setOpen(true);
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      const hit = hits[active] ?? hits[0];
      if (hit) {
        setOpen(false);
        router.push(hit.href);
      }
    }
  }

  return (
    <div className={styles.wrap} ref={rootRef}>
      <div className={`${styles.bar} ${showPanel ? styles.barOpen : ""}`}>
        <span aria-hidden="true" className={styles.glyph}>
          <svg fill="none" height="19" viewBox="0 0 20 20" width="19">
            <circle cx="8.6" cy="8.6" r="5.85" stroke="currentColor" strokeWidth="1.7" />
            <path d="M13 13.1 17.4 17.5" stroke="currentColor" strokeLinecap="round" strokeWidth="1.7" />
          </svg>
        </span>

        <input
          aria-autocomplete="list"
          aria-controls={showPanel ? listId : undefined}
          aria-expanded={showPanel}
          aria-label="내 재배 계획, 재배 공간, 작물 가이드에서 찾기"
          autoComplete="off"
          className={styles.input}
          enterKeyHint="search"
          onChange={(event) => handleChange(event.target.value)}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="작물이나 재배 계획을 검색해보세요"
          role="combobox"
          type="text"
          value={query}
        />

        {query !== "" && (
          <button
            aria-label="검색어 지우기"
            className={styles.clear}
            onClick={() => { setQuery(""); setCursor(0); }}
            type="button"
          >
            <span aria-hidden="true">×</span>
          </button>
        )}
      </div>

      {showPanel && (
        <div className={styles.panel} id={listId} role="listbox">
          {hits.length === 0
            ? (
              <p className={styles.none}>
                내 재배 계획 · 재배 공간 · 작물 가이드에서 찾지 못했어요.
              </p>
            )
            : hits.map((hit, position) => (
              <Link
                aria-selected={position === active}
                className={`${styles.hit} ${position === active ? styles.hitActive : ""}`}
                href={hit.href}
                key={hit.key}
                onClick={() => setOpen(false)}
                onPointerEnter={() => setCursor(position)}
                role="option"
              >
                <span className={styles.hitArt} data-kind={hit.kind}>
                  {hit.image
                    ? <Image alt="" fill sizes="44px" src={hit.image} />
                    : <span aria-hidden="true">{hit.title.slice(0, 1)}</span>}
                </span>
                <span className={styles.hitText}>
                  <b>{hit.title}</b>
                  <small>{hit.subtitle}</small>
                </span>
                <span className={styles.hitKind}>{KIND_LABELS[hit.kind]}</span>
              </Link>
            ))}
        </div>
      )}

      {quickActions.length > 0 && (
        <ul className={styles.chips}>
          {quickActions.map((action) => (
            <li key={action.key}>
              <Link className={styles.chip} href={action.href}>
                {action.label}
                {action.count !== null && <b>{action.count}</b>}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export { homeQuickActions };
