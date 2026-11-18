"use client";

import dynamic from "next/dynamic";

// The comparison bar only shows once something is selected, so it is not part of the first
// JavaScript. (A dynamic import with ssr: false has to live in a client component.)
export const LazyCompareBar = dynamic(
  () => import("@/components/shop/compare-bar").then((module) => module.CompareBar),
  { ssr: false }
);
