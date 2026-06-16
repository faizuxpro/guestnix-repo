import type { MDXComponents } from "mdx/types";

import { Callout } from "./Callout";
import { Pullquote } from "./Pullquote";
import { Testimonial } from "./Testimonial";
import { Highlight } from "./Highlight";

import { Compare } from "./Compare";
import { ComparisonTable } from "./ComparisonTable";
import { Stat } from "./Stat";
import { Stats } from "./Stats";

import { Steps } from "./Steps";
import { Step } from "./Step";
import { Checklist } from "./Checklist";
import { CheckItem } from "./CheckItem";
import { Xlist } from "./Xlist";
import { XItem } from "./XItem";
import { Grid } from "./Grid";
import { GridItem } from "./GridItem";
import { Columns } from "./Columns";
import { Column } from "./Column";
import { Divider } from "./Divider";

import { CTA } from "./CTA";
import { NewsletterSignup } from "./NewsletterSignup";
import { Button } from "./Button";
import { Badge } from "./Badge";
import { Kbd } from "./Kbd";

import { Figure } from "./Figure";
import { Gallery } from "./Gallery";
import { YouTube } from "./YouTube";
import { Tweet } from "./Tweet";
import { Bookmark } from "./Bookmark";

import { Accordion } from "./Accordion";
import { AccordionItem } from "./AccordionItem";
import { Tabs } from "./Tabs";
import { Tab } from "./Tab";
import { Faq } from "./Faq";
import { FaqItem } from "./FaqItem";

import { StyledLink } from "./prose-overrides";

export const mdxComponents: MDXComponents = {
  Callout, Pullquote, Testimonial, Highlight,
  Compare, ComparisonTable, Stat, Stats,
  Steps, Step, Checklist, CheckItem, Xlist, XItem, Grid, GridItem, Columns, Column, Divider,
  CTA, NewsletterSignup, Button, Badge, Kbd,
  Figure, Gallery, YouTube, Tweet, Bookmark,
  Accordion, AccordionItem, Tabs, Tab, Faq, FaqItem,
  a: StyledLink,
};
