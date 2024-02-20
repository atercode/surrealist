import { TableNode } from "~/views/designer/TableGraphPane/nodes/TableNode";
import { EdgeNode } from "./nodes/EdgeNode";
import { TableDefinition } from "~/types";
import { extractEdgeRecords } from "~/util/schema";
import { Edge, Node, NodeChange, Position } from "reactflow";
import { toBlob, toSvg } from "html-to-image";
import ELK from "elkjs/lib/elk.bundled";

export const NODE_TYPES = {
	table: TableNode,
	edge: EdgeNode,
};

const ELK_OPTIONS = {
	'elk.algorithm': 'layered',
	'elk.layered.spacing.nodeNodeBetweenLayers': '100',
	'elk.spacing.nodeNode': '80',
};

const EDGE_OPTIONS = {
	type: 'smoothstep',
	style: { strokeWidth: 2 },
	pathOptions: { borderRadius: 50 }
};

export type InternalNode = Node & { width: number, height: number };

export interface NodeData {
	table: TableDefinition;
	isSelected: boolean;
	hasLeftEdge: boolean;
	hasRightEdge: boolean;
}

interface NormalizedTable {
	isEdge: boolean;
	table: TableDefinition;
	from: string[];
	to: string[];
}

function normalizeTables(tables: TableDefinition[]): NormalizedTable[] {
	return tables.map((table) => {
		const [isEdge, from, to] = extractEdgeRecords(table);

		return {
			table,
			isEdge,
			to,
			from,
		};
	});
}

export function buildFlowNodes(tables: TableDefinition[]): [Node[], Edge[]] {
	const items = normalizeTables(tables);
	const nodeIndex: Record<string, Node> = {};
	const edges: Edge[] = [];
	const nodes: Node[] = [];

	// Define all nodes
	for (const { table, isEdge } of items) {
		const name = table.schema.name;
		const node: Node<NodeData> = {
			id: name,
			type: isEdge ? "edge" : "table",
			position: { x: 0, y: 0 },
			sourcePosition: Position.Right,
			targetPosition: Position.Left,
			data: {
				table,
				isSelected: false,
				hasLeftEdge: false,
				hasRightEdge: false
			},
		};

		nodes.push(node);
		nodeIndex[name] = node;
	}

	const edgeItems = items.filter((item) => item.isEdge);

	// Define all edges
	for (const { table, from, to } of edgeItems) {
		for (const fromTable of from) {
			edges.push({
				...EDGE_OPTIONS,
				id: `${table.schema.name}-${fromTable}`,
				source: fromTable,
				target: table.schema.name
			});

			const node = nodeIndex[fromTable];

			if (node) {
				node.data.hasRightEdge = true;
			}
		}

		for (const toTable of to) {
			edges.push({
				...EDGE_OPTIONS,
				id: `${table.schema.name}-${toTable}`,
				source: table.schema.name,
				target: toTable
			});

			const node = nodeIndex[toTable];

			if (node) {
				node.data.hasLeftEdge = true;
			}
		}
	}
	
	return [nodes, edges];
}

/**
 * Apply a layout to the given nodes and edges
 * 
 * @param nodes The nodes to layout
 * @param edges The edges to layout
 * @returns The changes to apply
 */
export async function applyNodeLayout(nodes: InternalNode[], edges: Edge[]): Promise<NodeChange[]> {
	const elk = new ELK();
	const graph = {
		id: 'root',
		children: nodes.map(node => ({
			id: node.id,
			width: node.width,
			height: node.height,	
		})),
		edges: edges.map(edge => ({
			id: edge.id,
			sources: [edge.source],
			targets: [edge.target]
		}))
	};

	const layout = await elk.layout(graph, {
		layoutOptions: ELK_OPTIONS
	});
	
	const children = layout.children || [];

	return children.map(({ id, x, y }) => {
		return {
			id,
			type: "position",
			position: { x: x!, y: y! }
		};
	});
}

/**
 * Create a snapshot of the given element
 * 
 * @param el The element to snapshot
 * @param type The type of output to create
 * @returns 
 */
export async function createSnapshot(el: HTMLElement, type: 'png' | 'svg') {
	if (type == 'png') {
		return toBlob(el, { cacheBust: true });
	} else {
		const dataUrl = await toSvg(el, { cacheBust: true });
		const res = await fetch(dataUrl);

		return await res.blob();
	}
}