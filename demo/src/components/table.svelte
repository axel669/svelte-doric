<script>
    import {
        Table,
        Ripple,

        Card,
        CardContent,
        Text,
    } from "#lib"

    // import Props from "./props.svelte"

    const props = {
        flow: {
            type: "boolean",
            desc: "If true renders the AppBar as a regular flow item isntead of as a sticky item"
        }
    }

    const firstCols = [
        {header: "ID", size: "40px"},
        {header: "Name"},
    ]
    const first = Array.from(
        {length: 5},
        (_, i) => ({
            id: i,
            name: `Item ${i + 1}`,
        })
    )
    const second = Array.from(
        {length: 5},
        (_, i) => ({
            id: i.toString().repeat(3),
            name: `Item ${i + 1}`,
        })
    )
;</script>

<style>
    .break {
        word-break: break-all;
    }
</style>

<Card>
    <CardContent>
        <Text variant="title">
            Table
        </Text>

        <Table colWidth="50px 1fr" data={first} let:item>
            <table-row>
                <table-cell>
                    <Ripple />
                    {item.id}
                </table-cell>
                <table-cell>
                    {item.name}
                </table-cell>
            </table-row>
        </Table>

        <Table colWidth="50px 1fr" data={second} let:item scrollHeight="100px">
            <table-header slot="header">
                <table-cell>
                    ID
                </table-cell>
                <table-cell>
                    Name
                </table-cell>
            </table-header>
            <table-row>
                <table-cell class="break">
                    {item.id}
                </table-cell>
                <table-cell>
                    {item.name}
                </table-cell>
                <Ripple />
            </table-row>
        </Table>
        <Table data={[]} let:item scrollHeight="100px">
            <table-header slot="header">
                <table-cell>
                    ID
                </table-cell>
                <table-cell>
                    Name
                    <Ripple />
                </table-cell>
            </table-header>

            <div slot="empty">
                No items here boss
            </div>

            <table-row>
                <table-cell class="break">
                    {item.id}
                </table-cell>
                <table-cell>
                    {item.name}
                </table-cell>
            </table-row>
        </Table>
    </CardContent>
</Card>
