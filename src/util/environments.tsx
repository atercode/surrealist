import { store } from "~/store";
import { ConnectionOptions } from "~/types";

/**
 * Returns the currently active tab
 */
export function getActiveTab() {
	const { activeTab, tabs } = store.getState().config;

	return tabs.find((tab) => tab.id === activeTab);
}

/**
 * Create an empty connection
 */
export function createEmptyConnection(): ConnectionOptions {
	return {
		endpoint: "",
		namespace: "",
		database: "",
		username: "",
		password: "",
		authMode: "root",
		scope: "",
		scopeFields: [],
	};
}

/**
 * Merge two connections together
 */
export function mergeConnections(
	left: Partial<ConnectionOptions>,
	right: Partial<ConnectionOptions>
): ConnectionOptions {
	const leftFields = left.scopeFields || [];
	const rightFields = right.scopeFields || [];

	return {
		namespace: left.namespace || right.namespace || "",
		database: left.database || right.database || "",
		endpoint: left.endpoint || right.endpoint || "",
		username: left.username || right.username || "",
		password: left.password || right.password || "",
		authMode: left.authMode || right.authMode || ("" as any),
		scope: left.scope || right.scope || "",
		scopeFields: [...leftFields, ...rightFields],
	};
}

/**
 * Returns whether the given connection is valid
 */
export function isConnectionValid(details: ConnectionOptions | undefined) {
	if (!details) {
		return false;
	}

	return !!(
		details.endpoint &&
		details.namespace &&
		details.database &&
		details.username &&
		details.password &&
		details.authMode
	);
}
