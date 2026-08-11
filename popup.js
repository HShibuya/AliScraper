var savedDataArray = [];
const currencyRoundedDecimal = (currencyType) => {
    switch (currencyType){
        case("$"):
            return 100;
        case("円"):
            return 1;
    }
}

window.onload = function(){
    chrome.storage.local.get(["dataArray"]).then((result)=>{
        savedDataArray = result.dataArray;
        const numOfOrders = savedDataArray.length;
        document.getElementById('orderNumber').textContent = numOfOrders;
        prepareCSVLink();
    })
}

const clearDataArray = () => {
    chrome.storage.local.set({"dataArray": []})
    savedDataArray = [];
    document.getElementById('orderNumber').textContent = 0;
    prepareCSVLink();
}

const prepareCSVLink = () => {
    const titleKeys = [[
        "Order Id",
        "Order Date",
        "Name",
        "Variant",
        "Price",
        "Quantity",
        "Number Per Order",
        "Item Subtotal",
        "Shipping",
        "Coins",
        "Spend & Save",
        "Discount",
        "Bonus",
        "Total",
        "Currency",
        "Store Name"
    ]];
    console.log(titleKeys,savedDataArray);
    const csvArray = titleKeys.concat(savedDataArray);
    console.log(csvArray)
    let csvContent = ''

    csvArray.forEach((row) => {
        csvContent += row.join(',') + '\n'
    })

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8,' });
    const objUrl = URL.createObjectURL(blob);
    document.getElementById("download").setAttribute('href', objUrl);
    document.getElementById("download").setAttribute('download', 'File.csv');
}

document.getElementById('aliExDiv').getElementsByClassName("scrapeBtn")[0].addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, {action: "scrapeAliExpressOrders"}, function(response) {
            console.log(response)
            const aliExDiv = document.getElementById('aliExDiv');
            if (chrome.runtime.lastError) {
                console.error(chrome.runtime.lastError);
                aliExDiv.getElementsByClassName("output")[0].textContent = "Error: " + chrome.runtime.lastError.message;
            } else {
                if(response.error){
                    aliExDiv.getElementsByClassName("output")[0].textContent = JSON.stringify(response.message, null, 2);
                    return;
                }
                let newDataArray = response.data;
                console.log(newDataArray);
                
                chrome.storage.local.get(["dataArray"]).then((result)=>{
                    console.log(result)
                    savedDataArray = result.dataArray
                    let isFound = false;
                    savedDataArray.forEach((row)=>{
                        if(row==null){
                            return;
                        }
                        if(row[0]==newDataArray[0][0]){
                            isFound = true;
                        }
                    })
                    if(!isFound){
                        const newSavedDataArray = savedDataArray.concat(newDataArray);
                        savedDataArray = newSavedDataArray;
                        chrome.storage.local.set({"dataArray": newSavedDataArray}).then(()=>{
                            aliExDiv.getElementsByClassName("output")[0].textContent = "Saved Data"
                            document.getElementById('orderNumber').textContent = newSavedDataArray.length;
                        })
                        prepareCSVLink();
                    }
                    else{
                        aliExDiv.getElementsByClassName("output")[0].textContent = "Already Saved"
                        document.getElementById('orderNumber').textContent = savedDataArray.length;
                    }
                })
            }
        });
    });
});
document.getElementById('aliBabaDiv').getElementsByClassName("scrapeOrder")[0].addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, {action: "scrapeAliBabaOrders"}, function(response) {
            console.log(response)
            const aliBabaDiv = document.getElementById('aliBabaDiv')
            if (chrome.runtime.lastError) {
                console.error(chrome.runtime.lastError);
                aliBabaDiv.getElementsByClassName("output")[0].textContent = "Error: " + chrome.runtime.lastError.message;
            } else {
                if(response.error){
                    aliBabaDiv.getElementsByClassName("output")[0].textContent = JSON.stringify(response.message, null, 2);
                    return;
                }
                let newDataArray = response.data;
                console.log(newDataArray);
                
                chrome.storage.local.get(["dataArray"]).then((result)=>{
                    console.log(result)
                    savedDataArray = result.dataArray
                    let isFound = false;
                    savedDataArray.forEach((row)=>{
                        if(row==null){
                            return;
                        }
                        if(row[0]==newDataArray[0][0]){
                            isFound = true;
                        }
                    })
                    if(!isFound){
                        const newSavedDataArray = savedDataArray.concat(newDataArray);
                        savedDataArray = newSavedDataArray;
                        chrome.storage.local.set({"dataArray": newSavedDataArray}).then(()=>{
                            aliBabaDiv.getElementsByClassName("output")[0].textContent = "Saved Data"
                            document.getElementById("orderNumber").textContent = newSavedDataArray.length;
                        })
                        prepareCSVLink();
                    }
                    else{
                        aliBabaDiv.getElementsByClassName("output")[0].textContent = "Already Saved";
                        document.getElementById("orderNumber").textContent = newSavedDataArray.length;
                    }
                })
            }
        });
    });
});
document.getElementById('aliBabaDiv').getElementsByClassName("scrapePayment")[0].addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, {action: "scrapeAliBabaPayment"}, function(response) {
            console.log(response)
            const aliBabaDiv = document.getElementById('aliBabaDiv')
            if (chrome.runtime.lastError) {
                console.error(chrome.runtime.lastError);
                aliBabaDiv.getElementsByClassName("output")[0].textContent = "Error: " + chrome.runtime.lastError.message;
            } else {
                if(response.error){
                    aliBabaDiv.getElementsByClassName("output")[0].textContent = JSON.stringify(response.message, null, 2);
                    return;
                }
                const responseData = response.data;
                console.log(responseData);
                
                chrome.storage.local.get(["dataArray"]).then((result)=>{
                    console.log(result)
                    savedDataArray = result.dataArray
                    let addedTotal = 0;
                    let isFound = false;
                    let isCorrectCurrency = false;
                    const roundedDecimal = currencyRoundedDecimal(responseData.currency)
                    for(let i=0;i<savedDataArray.length;i++){
                        const row = savedDataArray[i]
                        if(row[0]==responseData.orderID && row[14]!=responseData.currency){
                            isFound = true;
                            isCorrectCurrency = true;
                            row[4]=Math.round(row[4]*responseData.conversionRateWithFee*roundedDecimal)/roundedDecimal;
                            row[7]=Math.round(row[7]*responseData.conversionRateWithFee*roundedDecimal)/roundedDecimal;
                            row[8]=Math.round(row[8]*responseData.conversionRateWithFee*roundedDecimal)/roundedDecimal;
                            row[9]=Math.round(row[9]*responseData.conversionRateWithFee*roundedDecimal)/roundedDecimal;
                            row[10]=Math.round(row[10]*responseData.conversionRateWithFee*roundedDecimal)/roundedDecimal;
                            row[11]=Math.round(row[11]*responseData.conversionRateWithFee*roundedDecimal)/roundedDecimal;
                            row[12]=Math.round(row[12]*responseData.conversionRateWithFee*roundedDecimal)/roundedDecimal;

                            if(i+1==savedDataArray.length || savedDataArray[i+1][0]!=responseData.orderID){
                                console.log("last item")
                                row[13] = responseData.total-addedTotal;
                            }
                            else{
                                console.log(i);
                                row[13]=Math.round(row[13]*responseData.conversionRateWithFee*roundedDecimal)/roundedDecimal;
                                addedTotal += row[13];
                            }
                            row[14]=responseData.currency;
                        }
                        else if(row[0]==responseData.orderID){
                            isFound = true;
                        }
                        else if(row[14]!=responseData.currency){
                            isCorrectCurrency = true
                        }
                    }
                    
                    if(isFound){
                        if(isCorrectCurrency){
                            chrome.storage.local.set({"dataArray": savedDataArray}).then(()=>{
                                aliBabaDiv.getElementsByClassName("output")[0].textContent = "Updated Payment"
                                document.getElementById("orderNumber").textContent = savedDataArray.length;
                            })
                            prepareCSVLink();
                        }
                        else{
                            aliBabaDiv.getElementsByClassName("output")[0].textContent = "Currency is the same";
                        document.getElementById("orderNumber").textContent = savedDataArray.length;
                        }
                    }
                    else{
                        aliBabaDiv.getElementsByClassName("output")[0].textContent = "Can't Find";
                        document.getElementById("orderNumber").textContent = savedDataArray.length;
                    }
                    
                })
            }
        });
    });
});
document.getElementById('clear').addEventListener('click', clearDataArray)
