"use client";

import Link from "next/link";
import type { ReactElement } from "react";
import { Button } from "@/components/ds";
import { getParentModuleGroup, isParentModuleTabActive } from "@/lib/navigation/parent-module-nav";

interface ParentModuleSubnavProps {
  pathname: string;
}

export function ParentModuleSubnav({ pathname }: ParentModuleSubnavProps): ReactElement | null {
  const group = getParentModuleGroup(pathname);
  if (!group) {
    return null;
  }

  return (
    <div className="sticky top-14 z-30 border-b border-border-subtle bg-bg-base/90 backdrop-blur-md">
      <div className="mx-auto w-full max-w-7xl px-4 py-1.5 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {group.tabs.map((tab) => {
            const active = isParentModuleTabActive(pathname, tab);
            return (
              <Link key={tab.id} href={tab.href} className="shrink-0">
                <Button size="sm" variant={active ? "premium" : "glass"}>
                  {tab.label}
                </Button>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
