"use client";

import React, { useMemo, useState } from "react";
import {
  Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle,
} from "@workspace/ui/components/card";

type TileProps = {
  title: string;
  description?: string;
  className?: string;
  headerExtra?: React.ReactNode;
  footer?: React.ReactNode;
  children?: React.ReactNode;
  minHeight?: string;
};
export function Tile({
  title,
  description,
  headerExtra,
  footer,
  className,
  children,
  minHeight,
}: TileProps) {
  return (
    <Card className={`bg-white/5 border-white/10 shadow-xl shadow-indigo-900/10 ${minHeight ?? ""} ${className ?? ""}`}>
      <CardHeader className="pb-2">
        <div className="flex items-end justify-between gap-4">
          <div>
            <CardTitle className="text-lg">{title}</CardTitle>
            {description ? <CardDescription>{description}</CardDescription> : null}
          </div>
          {headerExtra}
        </div>
      </CardHeader>
      <CardContent className="pt-0">{children}</CardContent>
      {footer ? <CardFooter>{footer}</CardFooter> : null}
    </Card>
  );
}