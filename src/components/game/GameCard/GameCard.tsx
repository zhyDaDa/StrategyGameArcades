import { useState, type ReactNode } from "react";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export interface GameCardThumbnailState {
  readonly hovered: boolean;
}

/** 首页卡片：只负责排版与悬停状态，缩略图由 games/<id>/ui 提供。 */
export interface GameCardProps {
  readonly name: string;
  readonly description: string;
  readonly thumbnail: (state: GameCardThumbnailState) => ReactNode;
}

export function GameCard({
  name,
  description,
  thumbnail,
}: GameCardProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <Card
      className="gap-0 py-0"
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
    >
      <div
        className={[
          "relative flex aspect-4/3 w-full items-center justify-center overflow-hidden border-b bg-muted",
          // 纸面方格底纹：缩略图看起来是从棋盘格里升起。
          "[background-image:linear-gradient(to_right,color-mix(in_srgb,var(--border-color)_40%,transparent)_1px,transparent_1px),linear-gradient(to_bottom,color-mix(in_srgb,var(--border-color)_40%,transparent)_1px,transparent_1px)]",
          "[background-size:22px_22px]",
        ].join(" ")}
      >
        {thumbnail({ hovered })}
      </div>
      <CardHeader className="py-4">
        <CardTitle>{name}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
    </Card>
  );
}