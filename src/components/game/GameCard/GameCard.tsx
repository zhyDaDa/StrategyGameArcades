import type { ReactNode } from "react";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

/** 首页卡片：只负责排版，缩略图由 games/<id>/ui 提供。 */
export interface GameCardProps {
  readonly name: string;
  readonly description: string;
  readonly thumbnail: ReactNode;
}

export function GameCard({
  name,
  description,
  thumbnail,
}: GameCardProps) {
  return (
    <Card className="gap-0 py-0">
      <div
        className={[
          "relative flex aspect-4/3 w-full items-center justify-center overflow-hidden border-b bg-muted",
          // 纸面方格底纹：缩略图看起来是从棋盘格里升起。
          "[background-image:linear-gradient(to_right,color-mix(in_srgb,var(--border-color)_40%,transparent)_1px,transparent_1px),linear-gradient(to_bottom,color-mix(in_srgb,var(--border-color)_40%,transparent)_1px,transparent_1px)]",
          "[background-size:22px_22px]",
        ].join(" ")}
      >
        {thumbnail}
      </div>
      <CardHeader className="py-4">
        <CardTitle>{name}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
    </Card>
  );
}