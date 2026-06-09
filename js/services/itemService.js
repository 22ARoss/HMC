import supabaseClient from "./supabaseClient.js";

// Start of General Functions
async function getCompanyId(){// Function to get the company ID for the currently logged in user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
        console.error("Error fetching user:", userError);
        return null;
    }

    const { data, error } = await supabaseClient
        .from("profiles")
        .select("company_id")
        .eq("id", user.id)
        .single();

    if (error) {
        console.error("Error fetching company ID:", error);
        return null;
    }

    return data?.company_id ?? null;
}
async function getManufacturerPrefixAndId(manufacturerName) { // Get manufacturer prefix and id
    const { data, error } = await supabaseClient
        .from("manufacturers")
        .select("prefix, id")
        .eq("name", manufacturerName)
        .single();
    if (error) {
        console.error("Error fetching manufacturer prefix:", error);
        return;
    }

    return { prefix: data?.prefix, id: data?.id }
}
async function insertItem(item, configType, stockType = null) {// Function to insert the item into the items table
    let data, error;

    if (configType === "stock") {
        if (stockType === "stick") {
            ({ data, error } = await supabaseClient
            .from("stick_items")
            .insert([{
                gauge: item.gauge,
                height: item.height,
                jamb_depth: item.jamb_depth,
                manufacturer_id: item.manufacturer_id,
                item_sku: item.itemNumber,
                company_id: item.company_id
            }])
            .select());
        } else {
            ({ data, error } = await supabaseClient
            .from("stock_items")
            .insert([{
                gauge: item.gauge,
                width: item.width,
                height: item.height,
                jamb_depth: item.jamb_depth,
                handing: item.handing,
                layout: item.layout,
                manufacturer_id: item.manufacturer_id,
                item_sku: item.itemNumber,
                company_id: item.company_id
            }])
            .select());
        }
    } else if (configType === "weld") {
        ({ data, error } = await supabaseClient
            .from("weld_assemblies")
            .insert([{
                anchors: item.anchor,
                header_face: item["header-face"],
                ept: item.ept,
                dps: item.dps,
                strike: item.strike,
                hinge_prep: item["hinge-prep"],
                fire_rating: item["fire-rating"],
                item_sku: item.itemNumber,
                company_id: item.company_id,
                stock_item_id: item.stock_item_id,
                manufacturer_id: item.manufacturer_id
            }])
            .select());
    } else {
        console.error("Unknown configType in insertItem:", configType);
        return { data: null, error: new Error("Unknown configType: " + configType) };
    }

    if (error) {
        if (error.code === '23505') {
            // Item already exists for this company — not a real failure
            return { data: null, error, duplicate: true };
        }
        console.error("Error inserting item:", error.message, error.details, error.hint, error.code);
        return { data: null, error };
    }

    return { data, error: null };
}
async function getAccountingId(itemNumber, companyId, configType, stockType = null) {// Function to get the accounting ID for the item we just inserted
    let data, error;
    if (configType === "stock") {
        if (stockType === "stick") {
            ({ data, error } = await supabaseClient
                .from("stick_items")
                .select("accounting_id")
                .eq("company_id", companyId)
                .eq("item_sku", itemNumber)
                .single());
        } else {
            ({ data, error } = await supabaseClient
                .from("stock_items")
                .select("accounting_id")
                .eq("company_id", companyId)
                .eq("item_sku", itemNumber)
                .single());
        }
    } else if (configType === "weld") {
        ({ data, error } = await supabaseClient
            .from("weld_assemblies")
            .select("accounting_id")
            .eq("company_id", companyId)
            .eq("item_sku", itemNumber)
            .single());
    }

    if (error) {
        console.error("Error fetching accounting ID:", error.message, error.details, error.code);
        return { data: null, error };
    }

    return { data: data?.accounting_id, error: null };
}
function displayAccountingId(itemNumber, accountingId, configType, stockType = null) {// Function to display the item number and accounting ID on the dashboard after insertion
    if (configType === "stock") {
        // Both KD and stick share these elements; labels are already updated by applyStockTypeVisibility
        document.getElementById("itemNumberConfig").innerText = itemNumber;
        document.getElementById("accountingId").innerText = accountingId;
    } else if (configType === "weld") {
        document.getElementById("weldItemNumberConfig").innerText = itemNumber;
        document.getElementById("weldAccountingId").innerText = accountingId;
    }
}

// Start of Stock Item Functions
async function generateStockItem(companyId){// Function to generate the item number and object to be inserted for stock items
    const manufacturer = document.getElementById("manufacturer").value.toUpperCase();
    const { prefix, id } = await getManufacturerPrefixAndId(manufacturer);
    if (!id || !prefix) {
        console.error("Invalid manufacturer selected:", manufacturer);
        return null;
    }
    const gauge = document.getElementById("gauge").value;
    const width = document.getElementById("width").value;
    const height = document.getElementById("height").value;
    const jamb_depth = document.getElementById("jamb_depth").value;
    const handing = document.getElementById("handing").value;
    const layout = document.getElementById("layout").value.toUpperCase();

    const itemNumber = `${prefix}-${gauge}G-${width}${height}-${jamb_depth}JD-${handing}-${layout}`;

    const item = {
        "gauge": gauge,
        "width": width,
        "height": height,
        "jamb_depth": jamb_depth,
        "handing": handing,
        "layout": layout,
        "itemNumber": itemNumber,
        "manufacturer_id": id,
        "company_id": companyId
    };

    return item;
}
async function processStockItem(companyId, configType){// Function to handle the full process of generating, inserting, and displaying a stock item
    const item = await generateStockItem(companyId);
    if (!item) return { item: null, error: new Error("Failed to generate Stock item") };

    const { data, error, duplicate } = await insertItem(item, configType);

    let accountingID;
    if (data){
        accountingID = data[0]?.accounting_id;
    } else if (duplicate) {
        const existing = await getAccountingId(item.itemNumber, item.company_id, configType);
        if (existing.data) {
            accountingID = existing.data;
        }
    }

    if (accountingID !== undefined) {
        displayAccountingId(item.itemNumber, accountingID, configType);
    }

    return { item, error };
}

// Start of Stick Item Functions
async function generateStickItem(companyId){// Function to generate the item number and object to be inserted for stick items
    const manufacturer = document.getElementById("manufacturer").value.toUpperCase();
    const { prefix, id } = await getManufacturerPrefixAndId(manufacturer);
    if (!id || !prefix) {
        console.error("Invalid manufacturer selected:", manufacturer);
        return null;
    }
    const gauge = document.getElementById("gauge").value;
    const height = document.getElementById("height").value;
    const jamb_depth = document.getElementById("jamb_depth").value;

    const itemNumber = `${prefix}-${gauge}G-${height}-${jamb_depth}JD-STK`;

    const item = {
        "gauge": gauge,
        "height": height,
        "jamb_depth": jamb_depth,
        "itemNumber": itemNumber,
        "manufacturer_id": id,
        "company_id": companyId
    };

    return item;
}
async function processStickItem(companyId, configType, stockType){// Function to handle the full process of generating, inserting, and displaying a stick item
    const item = await generateStickItem(companyId);
    if (!item) return { item: null, error: new Error("Failed to generate stick item") };

    const { data, error, duplicate } = await insertItem(item, configType, stockType);

    let accountingID;
    if (data){
        accountingID = data[0]?.accounting_id;
    } else if (duplicate) {
        const existing = await getAccountingId(item.itemNumber, item.company_id, configType, stockType);
        if (existing.data) {
            accountingID = existing.data;
        }
    }

    if (accountingID !== undefined) {
        displayAccountingId(item.itemNumber, accountingID, configType, stockType);
    }

    return { item, error };
}

// Start of Weld Item Functions
async function generateWeldItem(stockItem){// Function to generate the item number and object to be inserted for weld items
    const stockItemSku = stockItem.itemNumber;
    const anchor = document.getElementById("anchor").value;
    const header_face = document.getElementById("header-face").value;
    const ept = document.getElementById("ept").value === "true";
    const dps = document.getElementById("dps").value === "true";
    const strike = document.getElementById("strike").value;
    const hinge_prep = document.getElementById("hinge-prep").value;
    const fire_rating = document.getElementById("fire-rating").value;
    const manufacturer_id = stockItem.manufacturer_id;
    const company_id = stockItem.company_id;
    const stock_item_id = await getStockItemId(stockItem.itemNumber, stockItem.company_id);

    const eptSegment = ept ? "-EPT" : "";
    const dpsSegment = dps ? "-DPS" : "";
    const itemNumber = `${stockItemSku}-WELD-${anchor}-${header_face}${eptSegment}${dpsSegment}-${strike}-${hinge_prep}-${fire_rating}`;

    if (!stock_item_id) {
        console.error("Cannot create weld item: stock item ID not found for", stockItem.itemNumber);
        return null;
    }

    const item = {
        "anchor": anchor,
        "header-face": header_face,
        "ept": ept,
        "dps": dps,
        "strike": strike,
        "hinge-prep": hinge_prep,
        "fire-rating": fire_rating,
        "itemNumber": itemNumber,
        "company_id": company_id,
        "stock_item_id": stock_item_id,
        "manufacturer_id": manufacturer_id
    };

    return item;
}
async function processWeldItem(stockItem, configType){// Function to handle the full process of generating, inserting, and displaying a weld item
    const weldItem = await generateWeldItem(stockItem);
    if (!weldItem) return { weldItem: null, error: new Error("Failed to generate weld item") };

    const { data, error, duplicate } = await insertItem(weldItem, configType);

    let accountingID;
    if (data){
        accountingID = data[0]?.accounting_id;
    } else if (duplicate) {
        const existing = await getAccountingId(weldItem.itemNumber, weldItem.company_id, configType);
        if (existing.data) {
            accountingID = existing.data;
        }
    }

    if (accountingID !== undefined) {
        displayAccountingId(weldItem.itemNumber, accountingID, configType);
    }

    return { weldItem, error };
}
async function getStockItemId(itemNumber, companyId){// Function to get the stock item ID so we can link it in the weld item
    const { data, error } = await supabaseClient
        .from("stock_items")
        .select("id")
        .eq("company_id", companyId)
        .eq("item_sku", itemNumber)
        .single();

    if (error) {
        console.error("Error fetching stock item ID:", error.message, error.details, error.code);
        return null;
    }

    return data?.id;
}

// Process Item
export async function processItem(){// Main function to be called on form submission to process the item based on configurator type
    const companyId = await getCompanyId();
    if (!companyId) {
        console.error("No company_id available; cannot create item.");
        return;
    }

    const configType = document.getElementById("configurator").value;

    if (configType === "stock"){
        const stockType = document.getElementById("stock-type").value;
        if (stockType === "KD"){
            const { item, error } = await processStockItem(companyId, configType);
        if (error) {
            console.error("Error processing stock item:", error);
        }
        } else if (stockType === "stick"){
            const { item, error } = await processStickItem(companyId, configType, stockType);
        if (error) {
            console.error("Error processing stock item:", error);
        }
        } else {
            console.error("Unknown stock type selected:", stockType);
            return;
        }
    } else if (configType === "weld"){
        try {
            const { item: stockItem, error: stockError } = await processStockItem(companyId, "stock");
            if (stockError && stockError.code !== '23505') {
                console.error("Error processing stock item:", stockError);
                return;
            }
            const { weldItem, error: weldError } = await processWeldItem(stockItem, configType);
            if (weldError) {
                console.error("Error processing weld item:", weldError);
            }
        } catch (e) {
            console.error("Exception in weld flow:", e);
        }
    } else{
        console.error("Unknown configurator type:", configType);
        return;
    }
}