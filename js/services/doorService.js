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
        return { prefix: null, manu_id: null };
    }

    return { prefix: data?.prefix, manu_id: data?.id }
}
async function insertDoor(item, configType) {// Function to insert the item into the items table
    let data, error;
    if (configType === "stock") {
        ({ data, error } = await supabaseClient
            .from("stock_doors")
            .insert([{
                width: item.width,
                height: item.height,
                thickness: item.thickness,
                gauge: item.gauge,
                lock_prep: item.lock_prep,
                hinge_prep: item.hinge_prep,
                edge: item.edge,
                core: item.core,
                fire_rating: item.fire_rating,
                handing: item.handing,
                manufacturer_id: item.manufacturer_id,
                item_sku: item.itemNumber,
                company_id: item.company_id
            }])
            .select());
    } else if (configType === "weld") {
        ({ data, error } = await supabaseClient
            .from("weld_door_assemblies")
            .insert([{
                ept: item.ept,
                dps: item.dps,
                raceway: item.raceway,
                undercut: item.undercut,
                cutout: item.cutout,
                item_sku: item.itemNumber,
                company_id: item.company_id,
                stock_door_id: item.stock_item_id,
                manufacturer_id: item.manufacturer_id
            }])
            .select());
    } else {
        console.error("Unknown configType in insertDoor:", configType);
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
async function getAccountingId(itemNumber, companyId, configType) {// Function to get the accounting ID for the item we just inserted
    let data, error;
    if (configType === "stock") {
        ({ data, error } = await supabaseClient
            .from("stock_doors")
            .select("accounting_id")
            .eq("company_id", companyId)
            .eq("item_sku", itemNumber)
            .single());

    } else if (configType === "weld") {
        ({ data, error } = await supabaseClient
            .from("weld_door_assemblies")
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
function displayAccountingId(itemNumber, accountingId, configType) {// Function to display the item number and accounting ID on the dashboard after insertion
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
async function generateStockDoor(companyId){// Function to generate the item number and object to be inserted for stock items
    const manufacturer = document.getElementById("manufacturer").value.toUpperCase();
    const { prefix, manu_id } = await getManufacturerPrefixAndId(manufacturer);
    if (!manu_id || !prefix) {
        console.error("Invalid manufacturer selected:", manufacturer);
        return null;
    }
    const width = document.getElementById("width").value;
    const height = document.getElementById("height").value;
    const thickness = document.getElementById("thickness").value;
    const gauge = document.getElementById("gauge").value;
    const lock_prep = document.getElementById("lock-prep").value;
    const hinge_prep = document.getElementById("hinge-prep").value;
    const edge = document.getElementById("edge").value
    const core = document.getElementById("core").value
    const fire_rating = document.getElementById("fire-rating").value
    const handing = document.getElementById("handing").value;

    const itemNumber = `${prefix}-${gauge}G-${width}${height}-${thickness}T-${edge}-${lock_prep}-${core}-${hinge_prep}-${fire_rating}-${handing}`;

    const item = {
        "width": width,
        "height": height,
        "thickness": thickness,
        "gauge": gauge,
        "edge": edge,
        "fire_rating": fire_rating,
        "handing": handing,
        "core": core,
        "lock_prep": lock_prep,
        "hinge_prep": hinge_prep,
        "itemNumber": itemNumber,
        "manufacturer_id": manu_id,
        "company_id": companyId
    };

    return item;
}
async function processStockDoor(companyId, configType){// Function to handle the full process of generating, inserting, and displaying a stock item
    const item = await generateStockDoor(companyId);
    if (!item) return { item: null, error: new Error("Failed to generate Stock item") };

    const { data, error, duplicate } = await insertDoor(item, configType);

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

// Start of Weld Item Functions
async function generateWeldDoor(stockItem){// Function to generate the item number and object to be inserted for weld items
    const stockItemSku = stockItem.itemNumber;
    const ept = document.getElementById("ept").value === "true";
    const dps = document.getElementById("dps").value === "true";
    const raceway = document.getElementById("raceway").value === "true";
    const undercut = document.getElementById("undercut").value;
    const cutout = document.getElementById("cutout").value;
    const manufacturer_id = stockItem.manufacturer_id;
    const company_id = stockItem.company_id;
    const stock_item_id = await getStockDoorId(stockItem.itemNumber, stockItem.company_id);

    const eptSegment = ept ? "-EPT" : "";
    const dpsSegment = dps ? "-DPS" : "";
    const racewaySegment = raceway ? "-RACE" : "";

    const itemNumber = `${stockItemSku}-WELD-${undercut}U-${cutout}${eptSegment}${dpsSegment}${racewaySegment}`;

    if (!stock_item_id) {
        console.error("Cannot create weld item: stock item ID not found for", stockItem.itemNumber);
        return null;
    }

    const item = {
        "ept": ept,
        "dps": dps,
        "raceway": raceway,
        "undercut": undercut,
        "cutout": cutout,
        "itemNumber": itemNumber,
        "company_id": company_id,
        "stock_item_id": stock_item_id,
        "manufacturer_id": manufacturer_id,
    };

    return item;
}
async function processWeldDoor(stockItem, configType){// Function to handle the full process of generating, inserting, and displaying a weld item
    const weldItem = await generateWeldDoor(stockItem);
    if (!weldItem) return { weldItem: null, error: new Error("Failed to generate weld item") };

    const { data, error, duplicate } = await insertDoor(weldItem, configType);

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
async function getStockDoorId(itemNumber, companyId){// Function to get the stock item ID so we can link it in the weld item
    const { data, error } = await supabaseClient
        .from("stock_doors")
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
export async function processDoor(){// Main function to be called on form submission to process the item based on configurator type
    const companyId = await getCompanyId();
    if (!companyId) {
        console.error("No company_id available; cannot create item.");
        return;
    }

    const configType = document.getElementById("configurator").value;

    if (configType === "stock"){
        const { item, error } = await processStockDoor(companyId, configType);
        if (error) {
            console.error("Error processing stock item:", error);
        }
    } else if (configType === "weld"){
        try {
            const { item: stockItem, error: stockError } = await processStockDoor(companyId, "stock");
            if (stockError && stockError.code !== '23505') {
                console.error("Error processing stock item:", stockError);
                return;
            }
            const { weldItem, error: weldError } = await processWeldDoor(stockItem, configType);
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