import { Button, Flex, ScrollArea, Tabs } from "@mantine/core";
import { useScrollIntoView } from "@mantine/hooks";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { useEffect, useMemo } from "react";

const SingleLineTabs: React.FC<{
  tabs: string[];
  currentTab: string;
  setCurrentTab: (newTab: string) => void;
}> = ({ setCurrentTab, currentTab, tabs }) => {
  const currentTabIndex = useMemo(
    () => tabs.findIndex((tab) => tab === currentTab),
    [currentTab, tabs],
  );

  const { targetRef, scrollableRef, scrollIntoView } = useScrollIntoView<
    HTMLButtonElement,
    HTMLDivElement
  >({ axis: "x", duration: 0 });

  useEffect(() => scrollIntoView({ alignment: "center" }), [currentTab, tabs]);
  return (
    <>
      <Flex align="center" justify="center">
        <Button
          variant="subtle"
          onClick={() => {
            setCurrentTab(tabs[Math.max(0, currentTabIndex - 1)]);
          }}
          disabled={currentTabIndex === 0}
        >
          <ChevronLeftIcon />
        </Button>
        <ScrollArea w={"100%"} scrollbars={false} viewportRef={scrollableRef}>
          <Tabs
            variant="default"
            value={currentTab}
            onChange={(newTab) => {
              if (newTab) {
                setCurrentTab(newTab);
              }
            }}
          >
            <Tabs.List
              style={{
                flexWrap: "unset",
                minWidth: "max-content", // Ensures it grows with content
              }}
              grow
              justify="space-between"
            >
              {tabs.map((tab) => (
                <Tabs.Tab
                  key={tab}
                  value={tab}
                  ref={currentTab === tab ? targetRef : undefined}
                >
                  {tab}
                </Tabs.Tab>
              ))}
            </Tabs.List>
          </Tabs>
        </ScrollArea>
        <Button
          variant="subtle"
          onClick={() => {
            setCurrentTab(tabs[Math.min(tabs.length - 1, currentTabIndex + 1)]);
          }}
          disabled={currentTabIndex === tabs.length - 1}
        >
          <ChevronRightIcon />
        </Button>
      </Flex>
    </>
  );
};

export default SingleLineTabs;
