import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

/** 由 GameModel.toCardData() 提供，组件本身不感知 GameModel。 */
export interface GameCardProps {
  readonly name: string;
  readonly description: string;
  readonly path: string;
  readonly cover: string | null;
  readonly coverFallback: string;
}

export function GameCard({
  name,
  description,
  path,
  cover,
  coverFallback,
}: GameCardProps) {
  return (
    <Card className="gap-0 py-0">
      {cover !== null ? (
        <img
          src={cover}
          alt={name}
          className="aspect-4/3 w-full object-cover"
        />
      ) : (
        <div
          aria-hidden="true"
          className="flex aspect-4/3 w-full items-center justify-center bg-muted text-5xl font-medium text-muted-foreground"
        >
          {coverFallback}
        </div>
      )}
      <CardHeader className="py-4">
        <CardTitle>{name}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
    </Card>
  );
}
