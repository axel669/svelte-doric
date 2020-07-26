<script>
import {
    AppBar,

    Adornment,
    Button,
    Card,
    CardContent,
    Icon,
    Text,
} from "#lib"

import Props from "./props.svelte"

const props = {
    flow: {
        type: "boolean",
        desc: "If true renders the AppBar as a regular flow item isntead of as a sticky item"
    }
}
;</script>

<style>
</style>

<Card>
    <CardContent>
        <Text variant="title">
            App Bar
        </Text>

        <Props {props} />

        <AppBar flow>
            <app-title>
                Title
            </app-title>

            <Adornment position="start">
                <Button round="40px" fab>
                    <Icon name="menu" size="22px" />
                </Button>
            </Adornment>

            <Adornment position="end">
                <Button round="40px" fab>
                    <Icon name="alarm" size="22px" />
                </Button>
                <Button round="40px" fab>
                    <Icon name="account_circle" size="22px" />
                </Button>
            </Adornment>
        </AppBar>
    </CardContent>
</Card>
