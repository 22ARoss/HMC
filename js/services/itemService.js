import supabaseClient from "./supabaseClient.js";

// Function to grab all values from the form and build the item bundle + create part number
async function generateItem() {
    const manufacturer = document.getElementById("manufacturer").value.toUpperCase();
    const gauge = document.getElementById("gauge").value;
    const width = document.getElementById("width").value;
    const height = document.getElementById("height").value;
    const jamb_depth = document.getElementById("jamb_depth").value;
    const handing = document.getElementById("handing").value;
    const layout = document.getElementById("layout").value.toUpperCase();

    const manufacturerPrefix = await getManufacturerPrefix(manufacturer);
    const itemNumber = `${manufacturerPrefix}-${gauge}G-${width}${height}-${jamb_depth}JD-${handing}-${layout}`;

    const item = {
        "gauge": gauge,
        "width": width,
        "height": height,
        "jamb_depth": jamb_depth,
        "handing": handing,
        "layout": layout,
        "manufacturer": manufacturer,
        "itemNumber": itemNumber,
        "manufacturer_id": null
    };

    return item;
}

export async function getManufacturerPrefix(manufacturerName) {
    const { data, error } = await supabaseClient
        .from("manufacturers")
        .select("prefix")
        .eq("name", manufacturerName)
        .single();
    if (error) {
        console.error("Error fetching manufacturer prefix:", error);
        return;
    }

    return data?.prefix;
}

// Function to get the manufacturer ID so we can insert item into item table
export async function getManufacturerId(manufacturerName) {
    const { data, error } = await supabaseClient
        .from("manufacturers")
        .select("id")
        .eq("name", manufacturerName)
        .single();

    if (error) {
        console.error("Error fetching manufacturer ID:", error);
        return;
    }

    return data?.id;
}

// Function to insert the item into the items table
export async function insertItem(item){

    const { data, error } = await supabaseClient
        .from("stock_items")
        .insert([{
            gauge: item.gauge,
            width: item.width,
            height: item.height,
            jamb_depth: item.jamb_depth,
            handing: item.handing,
            layout: item.layout,
            manufacturer_id: item.manufacturer_id,
            item_sku: item.itemNumber
        }])
        .select()

    if (error) {
        console.error("Error inserting item:", error);
        return { data: null, error };
    }

    return { data, error: null };
}

// Function to get the accounting ID for the item we just inserted
export async function getAccountingId(itemNumber) {
    const { data, error } = await supabaseClient
        .from("stock_items")
        .select("accounting_id")
        .eq("item_sku", itemNumber)
        .single();

    if (error) {
        console.error("Error fetching accounting ID:", error);
        return { data: null, error };
    }

    return { data: data?.accounting_id, error: null };
}

// Function to display the accounting ID on the page
function displayAccountingId(itemNumber, accountingId) {
    document.getElementById("itemNumberConfig").innerText = itemNumber;
    document.getElementById("accountingId").innerText = accountingId;
    document.getElementById("manu_output").innerText = document.getElementById("manufacturer").value.toUpperCase();
    document.getElementById("desc_output").innerText = "HMF";
}

export async function processItem(){
    const item = await generateItem();
    const manufacturerId = await getManufacturerId(item.manufacturer);
    item.manufacturer_id = manufacturerId;

    const { data, error } = await insertItem(item);
    
    let accountingID;
    if (data){
        accountingID = data[0]?.accounting_id;
    } else {
        const existing = await getAccountingId(item.itemNumber);
        if (existing.data) {
            accountingID = existing.data;
        }
    }
    if (accountingID !== undefined) {
        displayAccountingId(item.itemNumber, accountingID);
    }
}