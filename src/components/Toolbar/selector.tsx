import classes from './style.module.scss';
import { Button, Divider, Group, Popover, SimpleGrid, Stack, TextInput } from "@mantine/core";
import { mdiMenuDown, mdiDatabase, mdiPlus, mdiChevronRight, mdiMagnify, mdiClose } from "@mdi/js";
import { Icon } from "../Icon";
import { SurrealistTab } from "~/typings";
import { Text } from "@mantine/core";
import { actions, store, useStoreValue } from "~/store";
import { VIEW_MODES } from '~/constants';
import { useStable } from '~/hooks/stable';
import { updateTitle, updateConfig } from '~/util/helpers';
import { MouseEvent, useEffect, useMemo, useState } from 'react';
import { useHotkeys, useInputState } from '@mantine/hooks';
import { createNewTab } from '~/util/environments';
import { Environments } from './environments';

function getTabIcon(tab: SurrealistTab) {
	return VIEW_MODES.find(v => v.id == tab.activeView)?.icon;
}

export interface SelectorProps {
	active: string | null;
	isLight: boolean;
	onSave: () => void;
}

export function Selector({ active, isLight, onSave }: SelectorProps) {
	const [ opened, setOpened ] = useState(false);
	const [ manageEnvs, setManageEnvs ] = useState(false);
	const [ viewingEnv, setViewingEnv ] = useState('');
	const [ search, setSearch ] = useInputState('');

	const tabs = useStoreValue(state => state.config.tabs);
	const environments = useStoreValue(state => state.config.environments);

	const tab = tabs.find(tab => tab.id === active);
	const environment = tab && environments.find(env => env.id === tab.environment);

	const filteredTabs = useMemo(() => {
		const needle = search.toLowerCase();
		
		return tabs.filter(tab => tab.environment === viewingEnv && (!needle || tab.name.toLowerCase().includes(needle)));
	}, [tabs, viewingEnv, search]);
	
	const select = useStable((id: string) => {
		store.dispatch(actions.setActiveTab(id));

		updateTitle();
		updateConfig();
		setOpened(false);
	});

	const openTab = useStable((index: number) => {
		const tab = filteredTabs[index];

		if (tab) {
			select(tab.id);
		}
	});

	const openEnvironment = useStable((id: string) => {
		setViewingEnv(id);
	});

	const createTab = useStable(() => {
		createNewTab({
			environment: viewingEnv
		});
	});

	const deleteTab = useStable((e: MouseEvent, id: string) => {
		e.stopPropagation();

		store.dispatch(actions.removeTab(id));
	});

	const openEnvManager = useStable(() => {
		setManageEnvs(true);
		setOpened(false);
	});

	const closeEnvManager = useStable(() => {
		setManageEnvs(false);
	});

	useEffect(() => {
		if (!viewingEnv) {
			const startEnv = environment?.id || environments[0]?.id;

			if (startEnv) {
				setViewingEnv(startEnv);
			}
		}
	}, [environments, environment]);
	
	useHotkeys([
		['ctrl+1', () => openTab(0)],
		['ctrl+2', () => openTab(1)],
		['ctrl+3', () => openTab(2)],
		['ctrl+4', () => openTab(3)],
		['ctrl+5', () => openTab(4)],
		['ctrl+6', () => openTab(5)],
		['ctrl+7', () => openTab(6)],
		['ctrl+8', () => openTab(7)],
		['ctrl+9', () => openTab(8)],
		['ctrl+0', () => openTab(9)],
	], []);

	return (
		<>
			<Popover
				opened={opened}
				onChange={setOpened}
				position="bottom-start"
				exitTransitionDuration={0}
				closeOnEscape
				shadow={`0 8px 25px rgba(0, 0, 0, ${isLight ? 0.35 : 0.75})`}
				withArrow
			>
				<Popover.Target>
					<Button
						px="xs"
						variant="subtle"
						color="light"
						onClick={() => setOpened(!opened)}
					>
						<Group spacing={6}>
							<Icon path={mdiDatabase} />
							{tab && environment ? (
								<>
									<Text>{environment.name}</Text>
									<Icon path={mdiChevronRight} color="dark.3" />
									<Text color="white">{tab.name}</Text>
								</>
							) : (
								<Text color="light.4">Select tab</Text>
							)}
							<Icon path={mdiMenuDown} />
						</Group>
					</Button>
				</Popover.Target>
				<Popover.Dropdown px="xs">
					<SimpleGrid cols={2}>
						<Stack spacing="xs">
							{environments.map(item => {
								const isActive = item.id === viewingEnv;

								return (
									<Button
										key={item.id}
										w={264}
										px={12}
										c={isLight ? 'black' : 'white'}
										color={isActive ? 'dark.7' : 'light'}
										variant={isActive ? 'filled' : 'subtle'}
										className={classes.entryButton}
										onClick={() => openEnvironment(item.id)}
									>
										{item.name}
									</Button>
								)
							})}

							<Divider
								color="dark.4"
							/>

							<Button
								w={264}
								px={12}
								color="light"
								variant="subtle"
								className={classes.manageButton}
								onClick={openEnvManager}
								rightIcon={<Icon path={mdiChevronRight} />}
							>
								Manage environments
							</Button>
						</Stack>
						<Stack spacing="xs" mih={250}>
							<Group>
								<TextInput
									placeholder="Search"
									variant="filled"
									icon={<Icon path={mdiMagnify} color="dark.3" />}
									style={{ flex: 1 }}
									value={search}
									onChange={setSearch}
									autoFocus
								/>
							</Group>

							{filteredTabs.length === 0 && tabs.length > 0 && (
								<Text
									align="center"
									py={7}
									c="dark.2"
								>
									No tabs found
								</Text>	
							)}

							{filteredTabs.map(item => {
								const isActive = item.id === tab?.id;

								return (
									<Button
										key={item.id}
										w={264}
										px={12}
										leftIcon={<Icon path={getTabIcon(item) ?? ''} color="surreal" />}
										c={isLight ? 'black' : 'white'}
										color={isActive ? 'pink' : 'light'}
										variant={isActive ? 'light' : 'subtle'}
										className={classes.entryButton}
										onClick={() => select(item.id)}
										rightIcon={
											<Icon
												path={mdiClose}
												onClick={e => deleteTab(e, item.id)}
											/>
										}
									>
										{item.name}
									</Button>
								)
							})}

							{!search && (
								<Button
									w={264}
									px={12}
									color="light"
									variant="subtle"
									className={classes.entryButton}
									leftIcon={<Icon path={mdiPlus} />}
									onClick={createTab}
								>
									Add tab
								</Button>
							)}
						</Stack>
					</SimpleGrid>
				</Popover.Dropdown>
			</Popover>

			<Environments
				opened={manageEnvs}
				onClose={closeEnvManager}
				onSave={onSave}
			/>
		</>
	)
}