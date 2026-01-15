"use client";

import { ArrowLeft, ArrowRight } from "@untitledui/icons";
import { useLocale } from "react-aria-components";
import { ButtonGroup, ButtonGroupItem } from "@/components/base/button-group/button-group";
import { Button } from "@/components/base/buttons/button";
import { useBreakpoint } from "@/hooks/use-breakpoint";
import { cx } from "@/utils/cx";
import type { PaginationRootProps } from "./pagination-base";
import { Pagination } from "./pagination-base";

const getPaginationLabels = (locale: string) => {
    const isSpanish = locale.toLowerCase().startsWith("es");

    return {
        pagination: isSpanish ? "Paginación" : "Pagination",
        previous: isSpanish ? "Anterior" : "Previous",
        next: isSpanish ? "Siguiente" : "Next",
        page: isSpanish ? "Página" : "Page",
        of: isSpanish ? "de" : "of",
        goToPreviousPage: isSpanish ? "Ir a la página anterior" : "Go to previous page",
        goToNextPage: isSpanish ? "Ir a la página siguiente" : "Go to next page",
    } as const;
};

interface PaginationProps extends Partial<Omit<PaginationRootProps, "children">> {
    /** Whether the pagination buttons are rounded. */
    rounded?: boolean;
}

const PaginationItem = ({ value, rounded, isCurrent }: { value: number; rounded?: boolean; isCurrent: boolean }) => {
    return (
        <Pagination.Item
            value={value}
            isCurrent={isCurrent}
            className={({ isSelected }) =>
                cx(
                    "flex size-10 cursor-pointer items-center justify-center p-3 text-sm font-medium text-quaternary outline-focus-ring transition duration-100 ease-linear hover:bg-primary_hover hover:text-secondary focus-visible:z-10 focus-visible:bg-primary_hover focus-visible:outline-2 focus-visible:outline-offset-2",
                    rounded ? "rounded-full" : "rounded-lg",
                    isSelected && "bg-primary_hover text-secondary",
                )
            }
        >
            {value}
        </Pagination.Item>
    );
};

interface MobilePaginationProps {
    /** The current page. */
    page?: number;
    /** The total number of pages. */
    total?: number;
    /** The class name of the pagination component. */
    className?: string;
    /** The function to call when the page changes. */
    onPageChange?: (page: number) => void;
}

const MobilePagination = ({ page = 1, total = 10, className, onPageChange }: MobilePaginationProps) => {
    const { locale } = useLocale();
    const labels = getPaginationLabels(locale);

    return (
        <nav aria-label={labels.pagination} className={cx("flex items-center justify-between md:hidden", className)}>
            <Button
                aria-label={labels.goToPreviousPage}
                iconLeading={ArrowLeft}
                color="secondary"
                size="sm"
                onClick={() => onPageChange?.(Math.max(0, page - 1))}
            />

            <span className="text-sm text-fg-secondary">
                {labels.page} <span className="font-medium">{page}</span> {labels.of} <span className="font-medium">{total}</span>
            </span>

            <Button
                aria-label={labels.goToNextPage}
                iconLeading={ArrowRight}
                color="secondary"
                size="sm"
                onClick={() => onPageChange?.(Math.min(total, page + 1))}
            />
        </nav>
    );
};

export const PaginationPageDefault = ({ rounded, page = 1, total = 10, className, ...props }: PaginationProps) => {
    const isDesktop = useBreakpoint("md");
    const { locale } = useLocale();
    const labels = getPaginationLabels(locale);

    return (
        <Pagination.Root
            {...props}
            page={page}
            total={total}
            className={cx("flex w-full items-center justify-between gap-3 border-t border-secondary pt-4 md:pt-5", className)}
        >
            <div className="hidden flex-1 justify-start md:flex">
                <Pagination.PrevTrigger asChild>
                    <Button iconLeading={ArrowLeft} color="link-gray" size="sm">
                        {isDesktop ? labels.previous : undefined}{" "}
                    </Button>
                </Pagination.PrevTrigger>
            </div>

            <Pagination.PrevTrigger asChild className="md:hidden">
                <Button iconLeading={ArrowLeft} color="secondary" size="sm">
                    {isDesktop ? labels.previous : undefined}
                </Button>
            </Pagination.PrevTrigger>

            <Pagination.Context>
                {({ pages, currentPage, total }) => (
                    <>
                        <div className="hidden justify-center gap-0.5 md:flex">
                            {pages.map((page, index) =>
                                page.type === "page" ? (
                                    <PaginationItem key={index} rounded={rounded} {...page} />
                                ) : (
                                    <Pagination.Ellipsis key={index} className="flex size-10 shrink-0 items-center justify-center text-tertiary">
                                        &#8230;
                                    </Pagination.Ellipsis>
                                ),
                            )}
                        </div>

                        <div className="flex justify-center text-sm whitespace-pre text-fg-secondary md:hidden">
                            {labels.page} <span className="font-medium">{currentPage}</span> {labels.of} <span className="font-medium">{total}</span>
                        </div>
                    </>
                )}
            </Pagination.Context>

            <div className="hidden flex-1 justify-end md:flex">
                <Pagination.NextTrigger asChild>
                    <Button iconTrailing={ArrowRight} color="link-gray" size="sm">
                        {isDesktop ? labels.next : undefined}
                    </Button>
                </Pagination.NextTrigger>
            </div>
            <Pagination.NextTrigger asChild className="md:hidden">
                <Button iconTrailing={ArrowRight} color="secondary" size="sm">
                    {isDesktop ? labels.next : undefined}
                </Button>
            </Pagination.NextTrigger>
        </Pagination.Root>
    );
};

export const PaginationPageMinimalCenter = ({ rounded, page = 1, total = 10, className, ...props }: PaginationProps) => {
    const isDesktop = useBreakpoint("md");
    const { locale } = useLocale();
    const labels = getPaginationLabels(locale);

    return (
        <Pagination.Root
            {...props}
            page={page}
            total={total}
            className={cx("flex w-full items-center justify-between gap-3 border-t border-secondary pt-4 md:pt-5", className)}
        >
            <div className="flex flex-1 justify-start">
                <Pagination.PrevTrigger asChild>
                    <Button iconLeading={ArrowLeft} color="secondary" size="sm">
                        {isDesktop ? labels.previous : undefined}
                    </Button>
                </Pagination.PrevTrigger>
            </div>

            <Pagination.Context>
                {({ pages, currentPage, total }) => (
                    <>
                        <div className="hidden justify-center gap-0.5 md:flex">
                            {pages.map((page, index) =>
                                page.type === "page" ? (
                                    <PaginationItem key={index} rounded={rounded} {...page} />
                                ) : (
                                    <Pagination.Ellipsis key={index} className="flex size-10 shrink-0 items-center justify-center text-tertiary">
                                        &#8230;
                                    </Pagination.Ellipsis>
                                ),
                            )}
                        </div>

                        <div className="flex justify-center text-sm whitespace-pre text-fg-secondary md:hidden">
                            {labels.page} <span className="font-medium">{currentPage}</span> {labels.of} <span className="font-medium">{total}</span>
                        </div>
                    </>
                )}
            </Pagination.Context>

            <div className="flex flex-1 justify-end">
                <Pagination.NextTrigger asChild>
                    <Button iconTrailing={ArrowRight} color="secondary" size="sm">
                        {isDesktop ? labels.next : undefined}
                    </Button>
                </Pagination.NextTrigger>
            </div>
        </Pagination.Root>
    );
};

export const PaginationCardDefault = ({ rounded, page = 1, total = 10, ...props }: PaginationProps) => {
    const isDesktop = useBreakpoint("md");
    const { locale } = useLocale();
    const labels = getPaginationLabels(locale);

    return (
        <Pagination.Root
            {...props}
            page={page}
            total={total}
            className="flex w-full items-center justify-between gap-3 border-t border-secondary px-4 py-3 md:px-6 md:pt-3 md:pb-4"
        >
            <div className="flex flex-1 justify-start">
                <Pagination.PrevTrigger asChild>
                    <Button iconLeading={ArrowLeft} color="secondary" size="sm">
                        {isDesktop ? labels.previous : undefined}
                    </Button>
                </Pagination.PrevTrigger>
            </div>

            <Pagination.Context>
                {({ pages, currentPage, total }) => (
                    <>
                        <div className="hidden justify-center gap-0.5 md:flex">
                            {pages.map((page, index) =>
                                page.type === "page" ? (
                                    <PaginationItem key={index} rounded={rounded} {...page} />
                                ) : (
                                    <Pagination.Ellipsis key={index} className="flex size-10 shrink-0 items-center justify-center text-tertiary">
                                        &#8230;
                                    </Pagination.Ellipsis>
                                ),
                            )}
                        </div>

                        <div className="flex justify-center text-sm whitespace-pre text-fg-secondary md:hidden">
                            {labels.page} <span className="font-medium">{currentPage}</span> {labels.of} <span className="font-medium">{total}</span>
                        </div>
                    </>
                )}
            </Pagination.Context>

            <div className="flex flex-1 justify-end">
                <Pagination.NextTrigger asChild>
                    <Button iconTrailing={ArrowRight} color="secondary" size="sm">
                        {isDesktop ? labels.next : undefined}
                    </Button>
                </Pagination.NextTrigger>
            </div>
        </Pagination.Root>
    );
};

interface PaginationCardMinimalProps {
    /** The current page. */
    page?: number;
    /** The total number of pages. */
    total?: number;
    /** The alignment of the pagination. */
    align?: "left" | "center" | "right";
    /** The class name of the pagination component. */
    className?: string;
    /** The function to call when the page changes. */
    onPageChange?: (page: number) => void;
}

export const PaginationCardMinimal = ({ page = 1, total = 10, align = "left", onPageChange, className }: PaginationCardMinimalProps) => {
    const { locale } = useLocale();
    const labels = getPaginationLabels(locale);

    return (
        <div className={cx("border-t border-secondary px-4 py-3 md:px-6 md:pt-3 md:pb-4", className)}>
            <MobilePagination page={page} total={total} onPageChange={onPageChange} />

            <nav aria-label={labels.pagination} className={cx("hidden items-center gap-3 md:flex", align === "center" && "justify-between")}>
                <div className={cx(align === "center" && "flex flex-1 justify-start")}>
                    <Button isDisabled={page === 1} color="secondary" size="sm" onClick={() => onPageChange?.(Math.max(0, page - 1))}>
                        {labels.previous}
                    </Button>
                </div>

                <span
                    className={cx(
                        "text-sm font-medium text-fg-secondary",
                        align === "right" && "order-first mr-auto",
                        align === "left" && "order-last ml-auto",
                    )}
                >
                    {labels.page} {page} {labels.of} {total}
                </span>

                <div className={cx(align === "center" && "flex flex-1 justify-end")}>
                    <Button isDisabled={page === total} color="secondary" size="sm" onClick={() => onPageChange?.(Math.min(total, page + 1))}>
                        {labels.next}
                    </Button>
                </div>
            </nav>
        </div>
    );
};

interface PaginationButtonGroupProps extends Partial<Omit<PaginationRootProps, "children">> {
    /** The alignment of the pagination. */
    align?: "left" | "center" | "right";
}

export const PaginationButtonGroup = ({ align = "left", page = 1, total = 10, ...props }: PaginationButtonGroupProps) => {
    const isDesktop = useBreakpoint("md");
    const { locale } = useLocale();
    const labels = getPaginationLabels(locale);

    return (
        <div
            className={cx(
                "flex border-t border-secondary px-4 py-3 md:px-6 md:pt-3 md:pb-4",
                align === "left" && "justify-start",
                align === "center" && "justify-center",
                align === "right" && "justify-end",
            )}
        >
            <Pagination.Root {...props} page={page} total={total}>
                <Pagination.Context>
                    {({ pages }) => (
                        <ButtonGroup size="md">
                            <Pagination.PrevTrigger asChild>
                                <ButtonGroupItem iconLeading={ArrowLeft}>{isDesktop ? labels.previous : undefined}</ButtonGroupItem>
                            </Pagination.PrevTrigger>

                            {pages.map((page, index) =>
                                page.type === "page" ? (
                                    <Pagination.Item key={index} {...page} asChild>
                                        <ButtonGroupItem isSelected={page.isCurrent} className="size-10 items-center justify-center">
                                            {page.value}
                                        </ButtonGroupItem>
                                    </Pagination.Item>
                                ) : (
                                    <Pagination.Ellipsis key={index}>
                                        <ButtonGroupItem className="pointer-events-none size-10 items-center justify-center rounded-none!">
                                            &#8230;
                                        </ButtonGroupItem>
                                    </Pagination.Ellipsis>
                                ),
                            )}

                            <Pagination.NextTrigger asChild>
                                <ButtonGroupItem iconTrailing={ArrowRight}>{isDesktop ? labels.next : undefined}</ButtonGroupItem>
                            </Pagination.NextTrigger>
                        </ButtonGroup>
                    )}
                </Pagination.Context>
            </Pagination.Root>
        </div>
    );
};
