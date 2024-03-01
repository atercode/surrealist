import { ActionIcon, Box, Button, Center, Divider, Group, ScrollArea, Select, Text, TextInput } from "@mantine/core";
import { useDebouncedValue, useInputState } from "@mantine/hooks";
import { FocusEvent, KeyboardEvent, useEffect, useMemo, useState } from "react";
import { DataTable } from "~/components/DataTable";
import { Icon } from "~/components/Icon";
import { ContentPane } from "~/components/Pane";
import { validate_where_clause } from "~/generated/surrealist-embed";
import { useStable } from "~/hooks/stable";
import { getSurreal } from "~/util/surreal";
import { useEventSubscription } from "~/hooks/event";
import { useSchema } from "~/hooks/schema";
import { themeColor } from "~/util/mantine";
import { iconChevronLeft, iconChevronRight, iconFilter, iconPlus, iconRefresh, iconServer, iconTable } from "~/util/icons";
import { tb } from "~/util/helpers";
import { useInterfaceStore } from "~/stores/interface";
import { RecordsChangedEvent } from "~/util/global-events";

const PAGE_SIZES = [
	{ label: "10 Results per page", value: "10" },
	{ label: "25 Results per page", value: "25" },
	{ label: "50 Results per page", value: "50" },
	{ label: "100 Results per page", value: "100" },
];

export interface ExplorerPaneProps {
	activeTable: string | undefined;
	onCreateRecord: () => void;
}

export function ExplorerPane({ activeTable, onCreateRecord }: ExplorerPaneProps) {
	const { openTableCreator } = useInterfaceStore.getState();

	const schema = useSchema();

	const [records, setRecords] = useState<unknown[]>([]);
	const [recordCount, setRecordCount] = useState(0);
	const [filtering, setFiltering] = useState(false);
	const [filter, setFilter] = useInputState("");
	const [pageText, setPageText] = useInputState("1");
	const [pageSize, setPageSize] = useState("25");
	const [sortMode, setSortMode] = useState<[string, "asc" | "desc"] | null>(null);
	const [page, setPage] = useState(1);

	const pageCount = Math.ceil(recordCount / Number.parseInt(pageSize));

	function setCurrentPage(number: number) {
		setPageText(number.toString());
		setPage(number);
	}

	const toggleFilter = useStable(() => {
		setFiltering(!filtering);
	});

	const [showFilter] = useDebouncedValue(filtering, 250);
	const [filterClause] = useDebouncedValue(filter, 500);

	const isFilterValid = useMemo(() => {
		return (!showFilter || !filter) || validate_where_clause(filter);
	}, [showFilter, filter]);

	const fetchRecords = useStable(async () => {
		if (!activeTable) {
			setRecords([]);
			setRecordCount(0);
			return;
		}

		const surreal = getSurreal();

		if (!surreal || !isFilterValid) {
			return;
		}

		const limitBy = Number.parseInt(pageSize);
		const startAt = (page - 1) * Number.parseInt(pageSize);
		const [sortCol, sortDir] = sortMode || ["id", "asc"];

		let countQuery = `SELECT * FROM count((SELECT * FROM ${tb(activeTable)}`;
		let fetchQuery = `SELECT * FROM ${tb(activeTable)}`;

		if (showFilter && filterClause) {
			countQuery += ` WHERE ${filterClause}`;
			fetchQuery += ` WHERE ${filterClause}`;
		}

		countQuery += "))";
		fetchQuery += ` ORDER BY ${sortCol} ${sortDir} LIMIT ${limitBy}`;

		if (startAt > 0) {
			fetchQuery += ` START ${startAt}`;
		}

		const response = await surreal.query(`${countQuery};${fetchQuery}`);
		const count = response[0].result?.[0] || 0;
		const records = response[1].result || [];

		setRecords(records);
		setRecordCount(count);

		if (page > pageCount) {
			setCurrentPage(pageCount || 1);
		}
	});

	useEffect(() => {
		fetchRecords();
	}, [activeTable, pageSize, page, sortMode, showFilter, filterClause]);

	useEventSubscription(RecordsChangedEvent, () => {
		fetchRecords();
	});

	const gotoPage = useStable((e: FocusEvent | KeyboardEvent) => {
		if (e.type === "keydown" && (e as KeyboardEvent).key !== "Enter") {
			return;
		}

		const value = (e.target as HTMLInputElement).value;
		let newPage = Number.parseInt(value).valueOf();

		if (!value || Number.isNaN(newPage)) {
			setPageText(page.toString());
			return;
		}

		if (newPage < 1) {
			newPage = 1;
		}

		if (newPage > pageCount) {
			newPage = pageCount;
		}

		setCurrentPage(newPage);
	});

	const previousPage = useStable(() => {
		if (page <= 1) return;

		setCurrentPage(page - 1);
	});

	const nextPage = useStable(() => {
		if (page >= pageCount) return;

		setCurrentPage(page + 1);
	});

	const openCreator = useStable(() => {
		onCreateRecord();
	});

	const headers = schema?.tables?.find((t) => t.schema.name === activeTable)?.fields?.map((f) => f.name) || [];
	const hasTables = (schema?.tables?.length ?? 0) > 0;

	return (
		<ContentPane
			title="Record Explorer"
			icon={iconTable}
			rightSection={
				activeTable && (
					<Group align="center">
						<ActionIcon title="Create record" onClick={openCreator}>
							<Icon path={iconPlus} />
						</ActionIcon>

						<ActionIcon title="Refresh table" onClick={fetchRecords}>
							<Icon path={iconRefresh} />
						</ActionIcon>

						<ActionIcon title="Toggle filter" onClick={toggleFilter}>
							<Icon path={iconFilter} />
						</ActionIcon>

						<Divider orientation="vertical" />

						<Icon path={iconServer} mr={-10} />
						<Text lineClamp={1}>
							{recordCount || "no"} rows
						</Text>
					</Group>
				)
			}>
			{activeTable ? (
				<>
					{filtering && (
						<TextInput
							placeholder="Enter filter clause..."
							leftSection={<Icon path={iconFilter} />}
							value={filter}
							onChange={setFilter}
							error={!isFilterValid}
							autoFocus
							styles={() => ({
								input: {
									fontFamily: "JetBrains Mono",
									borderColor: (isFilterValid ? undefined : themeColor("red")) + " !important",
								},
							})}
						/>
					)}
					{records.length > 0 ? (
						<ScrollArea
							style={{
								position: "absolute",
								inset: 12,
								top: filtering ? 40 : 0,
								bottom: 54,
								transition: "top .1s"
							}}
						>
							<DataTable
								data={records}
								sorting={sortMode}
								onSortingChange={setSortMode}
								headers={headers}
							/>
						</ScrollArea>
					) : (
						<Center h="90%">
							<Box ta="center">
								<Text c="slate">
									Table has no records
								</Text>
								<Button
									mt={6}
									variant="subtle"
									color="surreal.5"
									onClick={openCreator}
								>
									Would you like to create one?
								</Button>
							</Box>
						</Center>
					)}

					<Group
						gap="xs"
						justify="center"
						style={{
							position: "absolute",
							insetInline: 12,
							bottom: 12
						}}
					>
						<Group gap="xs">
							<ActionIcon
								onClick={previousPage}
								disabled={page <= 1}
							>
								<Icon path={iconChevronLeft} />
							</ActionIcon>

							<TextInput
								value={pageText}
								onChange={setPageText}
								maw={36}
								size="xs"
								withAsterisk
								onBlur={gotoPage}
								onKeyDown={gotoPage}
								styles={{
									input: {
										textAlign: "center",
										paddingInline: 0,
									},
								}}
							/>

							<Text c="slate">of {pageCount} pages</Text>

							<ActionIcon
								onClick={nextPage}
								disabled={page >= pageCount}
							>
								<Icon path={iconChevronRight} />
							</ActionIcon>
						</Group>

						<Select
							value={pageSize}
							onChange={setPageSize as any}
							data={PAGE_SIZES}
							size="xs"
						/>
					</Group>
				</>
			) : hasTables ? (
				<Center h="90%">
					<Text ta="center" c="slate">
						Select a table to view records
					</Text>
				</Center>
			) : (
				<Center h="90%">
					<Box ta="center">
						<Text c="slate">
							No tables defined in this database
						</Text>
						<Button
							mt={6}
							variant="subtle"
							color="surreal.5"
							onClick={openTableCreator}
						>
							Would you like to create one?
						</Button>
					</Box>
				</Center>
			)}
		</ContentPane>
	);
}
