// src/demos/RelationDemo.tsx
// @ts-nocheck
import React from 'react';
import { Relation, useTheme } from 'flowcloudai-ui';

export const RelationDemo = () => {
    // 使用 useTheme Hook 实时同步主题
    const { resolvedTheme } = useTheme();
    const theme = resolvedTheme; // 'light' or 'dark'

    const data = {
        nodes: [
            // 核心人物
            { id: '1', name: '狮心统帅', type: 'person', description: '最高指挥官', importance: 10 },
            { id: '7', name: '银月将军', type: 'person', description: '副指挥官', importance: 9 },
            { id: '8', name: '烈焰法师', type: 'person', description: '首席魔法顾问', importance: 8 },
            { id: '9', name: '影刃刺客', type: 'person', description: '情报主管', importance: 7 },
            
            // 主要组织
            { id: '2', name: '艾瑟拉·金狮战团', type: 'organization', description: '精英战斗部队', importance: 8 },
            { id: '3', name: '黎明之刃', type: 'organization', description: '特种作战分队', importance: 7 },
            { id: '4', name: '铁壁防线', type: 'organization', description: '防御部队', importance: 7 },
            { id: '5', name: '荣耀军团', type: 'organization', description: '功勋部队', importance: 9 },
            { id: '10', name: '星辰议会', type: 'organization', description: '魔法研究机构', importance: 8 },
            { id: '11', name: '暗影之手', type: 'organization', description: '秘密情报组织', importance: 7 },
            { id: '12', name: '圣光教会', type: 'organization', description: '宗教势力', importance: 6 },
            
            // 敌对势力
            { id: '13', name: '黑暗领主', type: 'person', description: '敌军统帅', importance: 9 },
            { id: '14', name: '深渊军团', type: 'organization', description: '主要敌对势力', importance: 8 },
            { id: '15', name: '亡灵巫师团', type: 'organization', description: '黑暗魔法组织', importance: 7 },
            
            // 重要事件
            { id: '6', name: '边境冲突', type: 'event', description: '北部边境事件', importance: 6 },
            { id: '16', name: '月光战役', type: 'event', description: '决定性战役', importance: 9 },
            { id: '17', name: '暗影入侵', type: 'event', description: '首都袭击事件', importance: 8 },
            { id: '18', name: '圣物失窃', type: 'event', description: '重要物品丢失', importance: 7 },
            { id: '19', name: '联盟成立', type: 'event', description: '多方结盟', importance: 8 },
            
            // 地点
            { id: '20', name: '王都', type: 'location', description: '首都城市', importance: 9 },
            { id: '21', name: '北境要塞', type: 'location', description: '边境军事重镇', importance: 7 },
            { id: '22', name: '迷雾森林', type: 'location', description: '神秘区域', importance: 6 },
            { id: '23', name: '龙脊山脉', type: 'location', description: '天然屏障', importance: 7 },
        ],
        edges: [
            // 隶属关系
            { source: '2', target: '1', label: '隶属于', type: 'subordinate' },
            { source: '3', target: '1', label: '隶属于', type: 'subordinate' },
            { source: '4', target: '1', label: '隶属于', type: 'subordinate' },
            { source: '7', target: '1', label: '辅佐', type: 'subordinate' },
            { source: '8', target: '1', label: '顾问', type: 'subordinate' },
            { source: '9', target: '7', label: '汇报', type: 'subordinate' },
            
            // 友好关系
            { source: '5', target: '2', label: '支援', type: 'friend' },
            { source: '5', target: '3', label: '协同', type: 'friend' },
            { source: '5', target: '4', label: '支援', type: 'friend' },
            { source: '10', target: '8', label: '支持', type: 'friend' },
            { source: '12', target: '5', label: '祝福', type: 'friend' },
            { source: '11', target: '9', label: '合作', type: 'friend' },
            
            // 敌对关系
            { source: '13', target: '1', label: '对抗', type: 'enemy' },
            { source: '14', target: '2', label: '交战', type: 'enemy' },
            { source: '14', target: '4', label: '进攻', type: 'enemy' },
            { source: '15', target: '10', label: '对立', type: 'enemy' },
            { source: '15', target: '12', label: '亵渎', type: 'enemy' },
            
            // 事件关联
            { source: '6', target: '4', label: '涉及', type: 'neutral' },
            { source: '6', target: '21', label: '发生于', type: 'neutral' },
            { source: '16', target: '1', label: '指挥', type: 'neutral' },
            { source: '16', target: '13', label: '指挥', type: 'neutral' },
            { source: '16', target: '23', label: '发生于', type: 'neutral' },
            { source: '17', target: '9', label: '阻止', type: 'neutral' },
            { source: '17', target: '11', label: '策划', type: 'neutral' },
            { source: '17', target: '20', label: '发生于', type: 'neutral' },
            { source: '18', target: '12', label: '损失', type: 'neutral' },
            { source: '18', target: '11', label: '调查', type: 'neutral' },
            { source: '19', target: '5', label: '参与', type: 'neutral' },
            { source: '19', target: '10', label: '参与', type: 'neutral' },
            { source: '19', target: '12', label: '参与', type: 'neutral' },
            
            // 地理位置关系
            { source: '2', target: '20', label: '驻守', type: 'neutral' },
            { source: '4', target: '21', label: '驻守', type: 'neutral' },
            { source: '3', target: '22', label: '巡逻', type: 'neutral' },
            { source: '14', target: '22', label: '出没', type: 'neutral' },
            { source: '15', target: '23', label: '据点', type: 'neutral' },
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
        <div style={{ width: '100%', height: '100vh', padding: '0' }}>
            <Relation
                data={data}
                theme={theme}
                height="100%"
                width="100%"
                onNodeClick={handleNodeClick}
                onEdgeClick={handleEdgeClick}
                autoFitContainer={true}
            />
        </div>
    );
};

export default RelationDemo;