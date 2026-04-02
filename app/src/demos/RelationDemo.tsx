// src/demos/RelationDemo.tsx
// @ts-nocheck
import React from 'react';
import { Relation } from 'flowcloudai-ui';

export const RelationDemo = () => {
    const getCurrentTheme = () => {
        // 方式1：如果主题在 html 的 data-theme 属性上
        const htmlTheme = document.documentElement.getAttribute('data-theme');
        if (htmlTheme === 'dark' || htmlTheme === 'light') return htmlTheme;

        // 方式2：如果主题在 localStorage
        const stored = localStorage.getItem('theme');
        if (stored === 'dark' || stored === 'light') return stored;

        // 方式3：检测系统偏好
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    };

    const theme = getCurrentTheme();

    const data = {
        nodes: [
            { id: '1', name: '狮心统帅', type: 'person', description: '最高指挥官', importance: 10 },
            { id: '2', name: '艾瑟拉·金狮战团', type: 'organization', description: '精英战斗部队', importance: 8 },
            { id: '3', name: '黎明之刃', type: 'organization', description: '特种作战分队', importance: 7 },
            { id: '4', name: '铁壁防线', type: 'organization', description: '防御部队', importance: 7 },
            { id: '5', name: '荣耀军团', type: 'organization', description: '功勋部队', importance: 9 },
            { id: '6', name: '边境冲突', type: 'event', description: '北部边境事件', importance: 6 },
        ],
        edges: [
            { source: '2', target: '1', label: '隶属于', type: 'subordinate' },
            { source: '3', target: '1', label: '隶属于', type: 'subordinate' },
            { source: '4', target: '1', label: '隶属于', type: 'subordinate' },
            { source: '5', target: '2', label: '支援', type: 'friend' },
            { source: '5', target: '3', label: '协同', type: 'friend' },
            { source: '5', target: '4', label: '支援', type: 'friend' },
            { source: '6', target: '4', label: '涉及', type: 'neutral' },
        ]
    };

    const handleNodeClick = (node: any) => {
        console.log('点击节点:', node);
        // 可以在这里添加您的业务逻辑
    };

    const handleEdgeClick = (edge: any) => {
        console.log('点击连线:', edge);
        // 可以在这里添加您的业务逻辑
    };

    return (
        <div style={{ width: '100%', height: '600px' }}>
            <Relation
                data={data}
                theme={theme}
                height="100%"
                width="100%"
                onNodeClick={handleNodeClick}
                onEdgeClick={handleEdgeClick}
            />
        </div>
    );
};

export default RelationDemo;