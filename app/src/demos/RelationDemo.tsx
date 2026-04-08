import { useMemo } from 'react';
import { Relation, useTheme } from 'flowcloudai-ui';
import type { RelationEdgeData, RelationNodeData, RelationTypeStyle } from 'flowcloudai-ui';
import { demoForceLayoutProvider } from './forceLayoutProvider';

const typeStyles: Record<string, RelationTypeStyle> = {
    character: { color: '#3b82f6', icon: 'CH' },
    faction: { color: '#10b981', icon: 'FA' },
    event: { color: '#ec4899', icon: 'EV' },
    location: { color: '#f97316', icon: 'LO' },
    artifact: { color: '#f59e0b', icon: 'AR' },
};

const variants = [
    { id: 'prime', label: 'Prime Sector' },
    { id: 'echo', label: 'Echo Sector' },
    { id: 'delta', label: 'Delta Sector' },
    { id: 'nova', label: 'Nova Sector' },
];

const baseNodes: RelationNodeData[] = [
    {
        id: 'king',
        title: 'Aurelian Voss',
        type: 'character',
        categoryId: 'Role',
        summary: 'Sovereign balancing court influence, frontier unrest, and pressure around the observatory breach.',
        importance: 10,
    },
    {
        id: 'spymaster',
        title: 'Mira Slate',
        type: 'character',
        categoryId: 'Role',
        summary: 'Intelligence director tracking theft routes, faction pressure, and cross-border agents.',
        importance: 9,
    },
    {
        id: 'magister',
        title: 'Cassian Ro',
        type: 'character',
        categoryId: 'Role',
        summary: 'Arcane adviser leading analysis of relic fragments and breach signatures.',
        importance: 8,
    },
    {
        id: 'marshal',
        title: 'Sevrin Ash',
        type: 'character',
        categoryId: 'Role',
        summary: 'Frontline commander responsible for reinforcements, forts, and supply stability.',
        importance: 8,
    },
    {
        id: 'archivist',
        title: 'Iris Quill',
        type: 'character',
        categoryId: 'Role',
        summary: 'Keeper of sealed records with access to ritual notes and historical observatory logs.',
        importance: 7,
    },
    {
        id: 'crown',
        title: 'Crown Dominion',
        type: 'faction',
        categoryId: 'Power',
        summary: 'Central government controlling trade law, military authority, and the capital court.',
        importance: 10,
    },
    {
        id: 'guild',
        title: 'Ashen Guild',
        type: 'faction',
        categoryId: 'Power',
        summary: 'Trade network funding expeditions, neutral on paper but opportunistic in private.',
        importance: 8,
    },
    {
        id: 'order',
        title: 'Mirror Order',
        type: 'faction',
        categoryId: 'Power',
        summary: 'Scholars and ritual stewards divided between containment and continued research.',
        importance: 8,
    },
    {
        id: 'border-army',
        title: 'North March',
        type: 'faction',
        categoryId: 'Power',
        summary: 'Border force stretched thin by raiders, shortages, and panic spreading from the breach.',
        importance: 8,
    },
    {
        id: 'sun-court',
        title: 'Sun Court',
        type: 'faction',
        categoryId: 'Power',
        summary: 'Political bloc seeking influence over relic custody and emergency rule.',
        importance: 7,
    },
    {
        id: 'ember-lens',
        title: 'Ember Lens',
        type: 'artifact',
        categoryId: 'Relic',
        summary: 'Core relic capable of storing heat, memory, and energy inside stable chambers.',
        importance: 9,
    },
    {
        id: 'seal-key',
        title: 'Seal Key',
        type: 'artifact',
        categoryId: 'Relic',
        summary: 'Calibration shard required to fully lock the observatory seal structure.',
        importance: 8,
    },
    {
        id: 'breach',
        title: 'Observatory Breach',
        type: 'event',
        categoryId: 'Event',
        summary: 'Underground rupture causing weather shifts, memory corruption, and mass displacement.',
        importance: 10,
    },
    {
        id: 'conclave',
        title: 'Ash Accord',
        type: 'event',
        categoryId: 'Event',
        summary: 'Emergency summit convened to settle troop passage, evacuation, and relic custody.',
        importance: 8,
    },
    {
        id: 'theft',
        title: 'Lens Theft',
        type: 'event',
        categoryId: 'Event',
        summary: 'The key relic fragment vanished in transit, triggering investigations and reprisals.',
        importance: 9,
    },
    {
        id: 'uprising',
        title: 'Frontier Uprising',
        type: 'event',
        categoryId: 'Event',
        summary: 'Supply cuts and rumors of hidden relic caches sparked a wave of fortified revolts.',
        importance: 7,
    },
    {
        id: 'harbor',
        title: 'Grey Harbor',
        type: 'location',
        categoryId: 'Location',
        summary: 'Major trade port where diplomatic talks, intelligence leaks, and smugglers intersect.',
        importance: 8,
    },
    {
        id: 'observatory',
        title: 'North Observatory',
        type: 'location',
        categoryId: 'Location',
        summary: 'Ritual facility above the buried seal structure and primary site of the breach.',
        importance: 9,
    },
    {
        id: 'frontier',
        title: 'Ember Frontier',
        type: 'location',
        categoryId: 'Location',
        summary: 'Unstable outer zone where refugees, patrols, and cult fragments all converge.',
        importance: 7,
    },
    {
        id: 'sanctum',
        title: 'Vault Sanctum',
        type: 'location',
        categoryId: 'Location',
        summary: 'Underground archive for dangerous texts and relic parts tied to the theft case.',
        importance: 7,
    },
];

const baseEdges: RelationEdgeData[] = [
    { source: 'crown', target: 'king', relation: 'one_way', content: 'ruled by', type: 'subordinate', important: true },
    { source: 'spymaster', target: 'king', relation: 'one_way', content: 'reports to', type: 'subordinate', important: true },
    { source: 'magister', target: 'king', relation: 'one_way', content: 'advises', type: 'subordinate' },
    { source: 'marshal', target: 'king', relation: 'one_way', content: 'demands reinforcements', type: 'subordinate' },
    { source: 'border-army', target: 'marshal', relation: 'one_way', content: 'takes command from', type: 'subordinate', important: true },
    { source: 'guild', target: 'crown', relation: 'two_way', content: 'trade leverage', type: 'friend', strength: 1.2 },
    { source: 'order', target: 'crown', relation: 'two_way', content: 'negotiates custody', type: 'friend', strength: 1.1 },
    { source: 'sun-court', target: 'crown', relation: 'two_way', content: 'contests authority', type: 'enemy', strength: 1.2 },
    { source: 'spymaster', target: 'guild', relation: 'one_way', content: 'secret audit', type: 'enemy', strength: 1.4 },
    { source: 'order', target: 'ember-lens', relation: 'one_way', content: 'guards records', type: 'neutral', important: true },
    { source: 'magister', target: 'ember-lens', relation: 'one_way', content: 'researches', type: 'neutral', strength: 1.5 },
    { source: 'archivist', target: 'order', relation: 'one_way', content: 'keeps archives for', type: 'subordinate' },
    { source: 'archivist', target: 'seal-key', relation: 'one_way', content: 'knows clues about', type: 'neutral' },
    { source: 'theft', target: 'ember-lens', relation: 'one_way', content: 'scattered pieces of', type: 'enemy', important: true },
    { source: 'theft', target: 'sanctum', relation: 'one_way', content: 'occurred at', type: 'neutral' },
    { source: 'breach', target: 'observatory', relation: 'one_way', content: 'erupted under', type: 'neutral', important: true },
    { source: 'breach', target: 'frontier', relation: 'one_way', content: 'destabilized', type: 'enemy', strength: 1.3 },
    { source: 'breach', target: 'ember-lens', relation: 'one_way', content: 'possibly triggered by', type: 'neutral', important: true },
    { source: 'conclave', target: 'harbor', relation: 'one_way', content: 'hosted in', type: 'neutral' },
    { source: 'conclave', target: 'crown', relation: 'one_way', content: 'driven by', type: 'neutral' },
    { source: 'conclave', target: 'guild', relation: 'one_way', content: 'funded by', type: 'friend' },
    { source: 'harbor', target: 'guild', relation: 'two_way', content: 'depends on', type: 'friend' },
    { source: 'frontier', target: 'border-army', relation: 'two_way', content: 'patrolled by', type: 'neutral' },
    { source: 'uprising', target: 'frontier', relation: 'one_way', content: 'happened in', type: 'neutral' },
    { source: 'uprising', target: 'border-army', relation: 'one_way', content: 'weakened', type: 'enemy' },
    { source: 'spymaster', target: 'frontier', relation: 'one_way', content: 'deployed agents to', type: 'neutral' },
    { source: 'seal-key', target: 'breach', relation: 'one_way', content: 'may contain', type: 'neutral', important: true },
    { source: 'observatory', target: 'sanctum', relation: 'two_way', content: 'shared archive lines', type: 'friend' },
    { source: 'sun-court', target: 'conclave', relation: 'one_way', content: 'pressured', type: 'enemy' },
    { source: 'guild', target: 'theft', relation: 'one_way', content: 'suspected in', type: 'enemy' },
];

const bridgeNodeIds = ['king', 'spymaster', 'ember-lens', 'breach', 'conclave', 'harbor'];

const buildExpandedDemoData = (): { nodes: RelationNodeData[]; edges: RelationEdgeData[] } => {
    const nodes: RelationNodeData[] = [];
    const edges: RelationEdgeData[] = [];

    variants.forEach((variant, variantIndex) => {
        const prefix = `${variant.id}::`;

        baseNodes.forEach((node) => {
            nodes.push({
                ...node,
                id: `${prefix}${node.id}`,
                title: variantIndex === 0 ? node.title : `${node.title} / ${variant.label}`,
                summary:
                    variantIndex === 0
                        ? node.summary
                        : `${node.summary} This thread belongs to ${variant.label}.`,
                importance: Math.max(1, (node.importance || 5) - (variantIndex === 0 ? 0 : 1)),
            });
        });

        baseEdges.forEach((edge) => {
            edges.push({
                ...edge,
                source: `${prefix}${edge.source}`,
                target: `${prefix}${edge.target}`,
            });
        });
    });

    for (let index = 0; index < variants.length - 1; index += 1) {
        const current = variants[index];
        const next = variants[index + 1];

        bridgeNodeIds.forEach((nodeId, bridgeIndex) => {
            edges.push({
                source: `${current.id}::${nodeId}`,
                target: `${next.id}::${nodeId}`,
                relation: bridgeIndex % 2 === 0 ? 'two_way' : 'one_way',
                content: `cross-link ${current.label} -> ${next.label}`,
                type: bridgeIndex < 3 ? 'neutral' : 'friend',
                important: bridgeIndex < 2,
                strength: 1.15 + bridgeIndex * 0.05,
            });
        });

        edges.push({
            source: `${current.id}::theft`,
            target: `${next.id}::sanctum`,
            relation: 'one_way',
            content: `leak path ${current.label} -> ${next.label}`,
            type: 'enemy',
            important: true,
            strength: 1.35,
        });

        edges.push({
            source: `${current.id}::guild`,
            target: `${next.id}::harbor`,
            relation: 'one_way',
            content: `trade path ${current.label} -> ${next.label}`,
            type: 'friend',
            strength: 1.2,
        });
    }

    return { nodes, edges };
};

export const RelationDemo = () => {
    const { resolvedTheme } = useTheme();
    const theme = resolvedTheme;

    const data = useMemo(buildExpandedDemoData, []);

    const handleNodeClick = (node: RelationNodeData) => {
        console.log('Clicked node:', node);
    };

    const handleEdgeClick = (edge: RelationEdgeData) => {
        console.log('Clicked edge:', edge);
    };

    return (
        <div style={{ width: '100%', height: '100vh', padding: '0' }}>
            <Relation
                data={data}
                layoutProvider={demoForceLayoutProvider}
                theme={theme}
                height="100%"
                width="100%"
                labelMode="hover"
                typeStyles={typeStyles}
                onNodeClick={handleNodeClick}
                onEdgeClick={handleEdgeClick}
                autoFitContainer={true}
            />
        </div>
    );
};

export default RelationDemo;
