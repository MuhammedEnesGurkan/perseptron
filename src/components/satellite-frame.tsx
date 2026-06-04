"use client";

import { Crosshair, LocateFixed, Maximize2 } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui";
import type { Prediction } from "@/lib/types";
import { cn } from "@/lib/utils";

type Detection = Prediction["detections"][number];
type Patch = NonNullable<Prediction["patches"]>[number];

export function SatelliteFrame({ image, compact = false, showBoxes = true, detections = [], patches = [] }: { image?: string | null; compact?: boolean; showBoxes?: boolean; detections?: Detection[]; patches?: Patch[] }) {
  const [imageSize, setImageSize] = useState({ width: 1, height: 1 });
  return (
    <div className={cn("grid-map topographic relative overflow-hidden rounded-xl border border-line bg-[#26332d]", compact ? "h-[250px]" : "h-[360px]")}>
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={image}
          alt="Yüklenen uydu görüntüsü"
          className="absolute inset-0 h-full w-full object-fill"
          onLoad={(event) => setImageSize({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight })}
        />
      ) : (
        <>
          <div className="absolute -left-8 top-8 h-24 w-[72%] rotate-[-14deg] border-y-[14px] border-[#69716b]/55 bg-[#3e4944]" />
          <div className="absolute left-[52%] top-[22%] grid grid-cols-3 gap-1 opacity-80">
            {Array.from({ length: 12 }).map((_, i) => <span key={i} className="h-8 w-10 rounded-sm border border-[#849084]/35 bg-[#556158]" />)}
          </div>
          <div className="absolute bottom-3 left-4 grid grid-cols-5 gap-1 opacity-55">
            {Array.from({ length: 20 }).map((_, i) => <span key={i} className="h-7 w-8 border border-[#889276]/20 bg-[#687459]/50" />)}
          </div>
        </>
      )}
      {!image && <div className="absolute inset-0 bg-[linear-gradient(105deg,rgba(17,24,22,.12),rgba(17,24,22,.48))]" />}
      <div className="absolute left-3 top-3 flex items-center gap-2"><Badge tone="neutral">{image ? "Yüklenen görüntü" : "Ön izleme alanı"}</Badge>{image && <Badge tone="success"><span className="h-1.5 w-1.5 rounded-full bg-success" />Orijinal renk</Badge>}</div>
      <button className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-lg border border-white/10 bg-black/35 text-white/70 hover:text-white"><Maximize2 className="h-3.5 w-3.5" /></button>
      {showBoxes && patches.map((patch) => <PatchBox key={`${patch.label}-${patch.bbox.join("-")}`} patch={patch} imageSize={imageSize} />)}
      {showBoxes && detections.map((detection) => detection.bbox && (
        <DetectionBox key={`${detection.label}-${detection.box}`} detection={detection} imageSize={imageSize} />
      ))}
      <Crosshair className="absolute left-1/2 top-1/2 h-7 w-7 -translate-x-1/2 -translate-y-1/2 text-white/45" />
      {!image && <div className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-lg border border-white/10 bg-black/35 px-2 py-1 text-[10px] text-white/65"><LocateFixed className="h-3 w-3" />Görüntü bekleniyor</div>}
    </div>
  );
}

function PatchBox({ patch, imageSize }: { patch: Patch; imageSize: { width: number; height: number } }) {
  const [left, top, right, bottom] = patch.bbox;
  const style = boxStyle([left, top, right, bottom], imageSize);
  return <div className="absolute border border-white/45 bg-black/10" style={style}><span className="absolute left-0 top-0 max-w-full truncate bg-black/60 px-1 py-0.5 text-[8px] font-semibold text-white">{patch.label}</span></div>;
}

function DetectionBox({ detection, imageSize }: { detection: Detection; imageSize: { width: number; height: number } }) {
  const style = boxStyle(detection.bbox ?? [0, 0, 0, 0], imageSize);
  return <div className="absolute border border-danger bg-danger/10" style={style}><span className="absolute -top-5 left-[-1px] bg-danger px-1.5 py-0.5 text-[9px] font-bold text-white">{detection.label} {Math.round(detection.confidence * 100)}%</span></div>;
}

function boxStyle([left, top, right, bottom]: [number, number, number, number], imageSize: { width: number; height: number }) {
  return {
    left: `${(left / imageSize.width) * 100}%`,
    top: `${(top / imageSize.height) * 100}%`,
    width: `${((right - left) / imageSize.width) * 100}%`,
    height: `${((bottom - top) / imageSize.height) * 100}%`,
  };
}
