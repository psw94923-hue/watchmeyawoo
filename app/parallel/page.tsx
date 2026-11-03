"use client";

import React from "react";
import { useRouter } from "next/navigation";
import ParallelLinesApp from "../components/ParallelLinesApp";

export default function ParallelPage() {
  const router = useRouter();
  return <ParallelLinesApp onBack={() => router.push("/grade2")} />;
}

