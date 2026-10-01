"use client";

import { Children, createContext, createElement, isValidElement, useContext, type ComponentProps, type CSSProperties, type ElementType, type MouseEvent, type ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { useCms } from "./cms-provider";
import type { CmsStyle } from "@/lib/cms/model";

type Props = {
  cmsId: string; instance?: string; as?: string; children?: ReactNode;
  style?: CSSProperties; href?: string; src?: string; alt?: string;
  onClickCapture?: (event: MouseEvent<HTMLElement>) => void;
  [key: string]: unknown;
};
const InstanceContext = createContext("");
export function CmsInstance({ instance, children }: { instance: string; children: ReactNode }) {
  const parent = useContext(InstanceContext);
  return <InstanceContext.Provider value={`${parent}/${instance}`}>{children}</InstanceContext.Provider>;
}
function Element({ cmsId, instance, as = "div", children, ...props }: Props & { component?: ElementType }) {
  const cms = useCms();
  const parent = useContext(InstanceContext);
  const scope = instance === undefined ? parent : `${parent}/${instance}`;
  const id = `${cmsId}${scope}`;
  const change = cms.document.elements[id];
  const { component, ...attributes } = props;
  const childArray = Children.toArray(children);
  const texts: Record<string, string> = {};
  childArray.forEach((child, index) => {
    if ((typeof child === "string" && child.trim()) || typeof child === "number") texts[index] = String(child);
  });
  let editedChildren = change?.texts ? childArray.map((child, index) => typeof child === "string" || typeof child === "number" ? change.texts[String(index)] ?? child : child) : children;
  const order = cms.document.order?.[id];
  if (order?.length) {
    const array = Children.toArray(editedChildren);
    const childId = (child: ReactNode) => {
      if (!isValidElement<{ cmsId?: string; instance?: string }>(child) || !child.props.cmsId) return "";
      return `${child.props.cmsId}${scope}${child.props.instance === undefined ? "" : `/${child.props.instance}`}`;
    };
    const movable = array.filter(child => order.includes(childId(child))).sort((a,b) => order.indexOf(childId(a)) - order.indexOf(childId(b)));
    let index = 0;
    editedChildren = array.map(child => order.includes(childId(child)) ? movable[index++] : child);
  }
  const style: CSSProperties = { ...props.style, ...change?.style };
  if (change?.hidden) {
    if (!cms.editing) style.display = "none";
    else { style.opacity = 0.35; style.outline = "2px dashed #f59e0b"; }
  }
  const overridden: Record<string, unknown> = {};
  if (change?.href !== undefined && props.href !== undefined) overridden.href = change.href;
  if (change?.src && props.src !== undefined) { overridden.src = change.src; if (component === Image) overridden.unoptimized = true; }
  if (change?.alt !== undefined && props.src !== undefined) overridden.alt = change.alt;
  const onClickCapture = (event: MouseEvent<HTMLElement>) => {
    if (cms.editing) {
      // The nearest annotated element owns this click, even when its parent captures first.
      if ((event.target as HTMLElement).closest("[data-cms-id]") !== event.currentTarget) return;
      event.preventDefault();
      event.stopPropagation();
      const computed = window.getComputedStyle(event.currentTarget);
      const parentElement = event.currentTarget.parentElement;
      const siblings = parentElement?.dataset.cmsId ? Array.from(parentElement.children).filter(el => el.tagName === "SECTION").map(el => (el as HTMLElement).dataset.cmsId).filter(Boolean) as string[] : [];
      cms.select({ id, tag: as, texts,
        href: typeof props.href === "string" ? props.href : undefined,
        src: typeof props.src === "string" ? props.src : undefined,
        alt: props.alt, style: { fontSize: parseFloat(computed.fontSize), textAlign: computed.textAlign as CmsStyle["textAlign"], ...change?.style },
        parentId: as === "section" && siblings.includes(id) ? parentElement?.dataset.cmsId : undefined, siblings,
      });
    } else props.onClickCapture?.(event);
  };
  const element = createElement(component || as, {
    ...attributes, ...overridden, style,
    ...(cms.preview ? { "data-cms-id": id, "data-cms-selected": cms.selected === id, onClickCapture } : {}),
  }, editedChildren);
  return <InstanceContext.Provider value={scope}>{element}</InstanceContext.Provider>;
}
export function CmsElement(props: Props) { return <Element {...props} />; }
export function CmsLink(props: ComponentProps<typeof Link> & { cmsId: string; instance?: string }) { return <Element {...props as unknown as Props} as="a" component={Link} />; }
export function CmsImage(props: ComponentProps<typeof Image> & { cmsId: string; instance?: string }) { return <Element {...props as unknown as Props} as="img" component={Image} />; }
