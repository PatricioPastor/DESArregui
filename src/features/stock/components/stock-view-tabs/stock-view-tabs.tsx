"use client";

import { Tabs } from "@/components/application/tabs/tabs";

export type StockView = "overview" | "linked_soti" | "in_transit" | "completed";

interface StockViewTabsProps {
  activeView: StockView;
  onViewChange: (view: StockView) => void;
  items: Array<{
    id: StockView;
    label: string;
    badge?: number;
  }>;
}

export function StockViewTabs({ activeView, onViewChange, items }: StockViewTabsProps) {
  return (
    <div className="w-full overflow-x-auto">
      <Tabs
        selectedKey={activeView}
        onSelectionChange={(key) => onViewChange(key as StockView)}
        className="w-full"
      >
        <Tabs.List type="button-minimal" items={items} className="min-w-max">
          {(item) => <Tabs.Item key={item.id} {...item} />}
        </Tabs.List>
      </Tabs>
    </div>
  );
}







