// tsup.config.ts
import {defineConfig} from "tsup";

const componentEntries = {
    Alert: 'src/entries/Alert.ts',
    Button: 'src/entries/Button.ts',
    Card: 'src/entries/Card.ts',
    CheckButton: 'src/entries/CheckButton.ts',
    ContextMenu: 'src/entries/ContextMenu.ts',
    ConversationTreeView: 'src/entries/ConversationTreeView.ts',
    DeleteDialog: 'src/entries/DeleteDialog.ts',
    Input: 'src/entries/Input.ts',
    LazyLoad: 'src/entries/LazyLoad.ts',
    ListGroup: 'src/entries/ListGroup.ts',
    MarkdownEditor: 'src/entries/MarkdownEditor.ts',
    MessageBox: 'src/entries/MessageBox.ts',
    OrphanDialog: 'src/entries/OrphanDialog.ts',
    RollingBox: 'src/entries/RollingBox.ts',
    Select: 'src/entries/Select.ts',
    SideBar: 'src/entries/SideBar.ts',
    Slider: 'src/entries/Slider.ts',
    TabBar: 'src/entries/TabBar.ts',
    TagItem: 'src/entries/TagItem.ts',
    TeraEditor: 'src/entries/TeraEditor.ts',
    ThemeProvider: 'src/entries/ThemeProvider.ts',
    Timeline: 'src/entries/Timeline.ts',
    Tree: 'src/entries/Tree.ts',
    VirtualList: 'src/entries/VirtualList.ts',
};

export default defineConfig({
    entry: {
        index: 'src/index.ts',
        ...componentEntries,
    },
    format: ['esm'],
    dts: true,
    clean: true,
    tsconfig: 'tsconfig.app.json',
    // 不用 injectStyle，改为生成独立 CSS 文件
    // 消费者 import 'flowcloudai-ui/style'
})
