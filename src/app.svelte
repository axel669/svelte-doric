<script context="module">
;</script>

<script>
import {
    AppTheme,
    Baseline as baseline,
    darkTheme,
    lightTheme,

    Image,
    Button,
    Card,
    CardActions,
    CardContent,
    Icon,

    List,
    ListItem,
    ListHeader,
    ListItemContent,
    TextInput,
    ControlLabel,

    Select,

    Avatar,
    Drawer,
    Checkbox,
    Switch,
    Radio,

    Dialog,
    Alert,
    Confirm,

    CircleSpinner,
    HexagonSpinner,

    Tabs,
    TabList,
    TabLabel,
    TabPanel,

    AppBar,
} from "../index.js"
import * as wat from "../index.js"

window.wat = wat

const images = {
    tifa: "https://media.discordapp.net/attachments/641431274916937738/726691343111553065/tifa_bikini_alt_by_nopeys_ddyq6fp-fullview.png?width=606&height=937",
    camilla: "https://media.discordapp.net/attachments/641431274916937738/726691793801838642/dcqeyjp-bba7f4f5-a6f0-4b2f-8f15-13967385a3f7.png?width=571&height=937",
    samus: "https://i.etsystatic.com/17439113/r/il/9346c1/2039257844/il_570xN.2039257844_jh20.jpg",
    dnd: "https://media.discordapp.net/attachments/511777706438950922/728027209377513582/3l5ovvzru9851.png",
}
// const image = images.dnd

let checked = true
;$: theme = (checked === true) ? darkTheme : lightTheme
// const theme = darkTheme
// const theme = lightTheme

const tabs = Array.from(
    {length: 5},
    (_, i) => i
)
let selectedTab = 0

let open = false

;</script>

<style>
/* :global(body) {
    background-image: url(https://media.discordapp.net/attachments/641431274916937738/726691343111553065/tifa_bikini_alt_by_nopeys_ddyq6fp-fullview.png);
    background-image: url(https://media.discordapp.net/attachments/511777706438950922/728027209377513582/3l5ovvzru9851.png);
    background-position: center center;
    background-repeat: repeat;
    background-attachment: fixed;
    backdrop-filter: opacity(10%);
} */

layout {
    display: flex;
    width: 100%;
    max-width: 768px;
    margin: 0 auto;
    flex-direction: column;
    /* align-items: start; */
    /* grid-template-columns: repeat(2, 1fr); */
}
</style>

<AppTheme {theme} {baseline} />

<AppBar>
    <app-title>
        Test?
    </app-title>

    <adornment position="start">
        <Button round="40px" fab on:click={() => open = true}>
            <Icon name="menu" size="20px" />
        </Button>
    </adornment>
    <adornment position="end">
        <Button round="40px" fab>
            <Icon name="share" size="20px" />
        </Button>
        <Button round="40px" fab>
            <Icon name="favorite" size="20px" />
        </Button>
    </adornment>
</AppBar>
<Drawer bind:open on:close={() => open = false}>
    <Button>
        Testing
    </Button>
</Drawer>

<div style="position: sticky; top: 0px; left: 0px; width: 200px; overflow: hidden; z-index: +50;">
    <Card>
        <Switch bind:checked color="primary">
            Theme: {checked ? "Dark" : "Light"}
        </Switch>
    </Card>
</div>

<layout>
    <Card>
        <Tabs bind:selectedTab>
            <TabList>
                <TabLabel value={0}>
                    Number: 0
                </TabLabel>
                <TabLabel value="hi">
                    String: Hi
                </TabLabel>

                {#each tabs as tab}
                    <TabLabel value={tab + 1}>
                        Tab {tab}
                    </TabLabel>
                {/each}
            </TabList>

            <CardContent>
                <TabPanel value={0}>
                    Numeric Content
                </TabPanel>

                <TabPanel value="hi">
                    String Content
                </TabPanel>

                <TabPanel value={2}>
                    <TextInput label="Text Input" />
                </TabPanel>
            </CardContent>
        </Tabs>
    </Card>
    <div>
        <Checkbox>
            Wat
        </Checkbox>
        <Switch>
            Wat
        </Switch>
        <Radio>
            Wat
        </Radio>
    </div>
    <div>
        <Button>
            Wtf
        </Button>
        Text
    </div>
</layout>

<TextInput />
