chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    console.log("hello");
    if (request.action === "scrapeAliExpressOrders") {
        const orderDetailInfo = document.getElementsByClassName("order-detail-info")[0]
        const orderId = orderDetailInfo.children[1].children[1].children[0].childNodes[1].textContent;
        const orderDate = getDateObjFromAliExString(orderDetailInfo.children[1].children[1].children[1].childNodes[1].textContent.replace(/\s/g, ""));
        const orderDateString = getDateStringForCSV(orderDate);
        console.log(orderDateString)
        const storeName = document.getElementsByClassName("store-name")[0].textContent;
        const orderItemsArray = document.getElementsByClassName("order-detail-item-content-wrap");

        const orderPriceContainer = document.getElementsByClassName("order-price")[0];
        const orderPriceSwitch = orderPriceContainer.querySelector("span");
        orderPriceSwitch.click();
        
        const orderPriceArray = orderPriceContainer.getElementsByClassName("order-price-item");
        console.log(orderPriceArray)
        if(orderPriceArray.length<3){
            /*
            console.log("Error: Need to get order price details")
            sendResponse({message: "Error: Need to get order price details", error:true});
            return;
            */
            document.getElementsByClassName("comet-icon comet-icon-arrowdown switch-icon")[0].click()
        }
        const orderSubTotalText = orderPriceArray[0].children[1].textContent;
        let currency;
        if(orderSubTotalText.includes("円")){
            currency = "円"
        }
        else if(orderSubTotalText.includes("$")){
            currency = "$"
        }
        else{
            sendResponse({message: "Error: currency not recognizable", error:true})
            return
        }
        const orderPriceData = {
            subtotal: 0,
            shipping: 0,
            coins: 0,
            spendSave: 0,
            discount: 0,
            bonus: 0,
            currency: currency,
            total: 0
        }
        orderPriceData.subtotal = Number(orderSubTotalText.replace(/[^.\d]/g, ''))
        Array.from(orderPriceArray).forEach((orderPrice)=>{
            if(orderPrice.children[0].textContent.trim() == "Subtotal"){
                return;
            }
            else if(orderPrice.children[0].textContent.trim() == "Shipping" || orderPrice.children[0].textContent.trim() == "Installment payment fee"){
                if(orderPrice.children[1].textContent.trim() != "Free Shipping"){
                    orderPriceData.shipping += Number(orderPrice.children[1].textContent.replace(/[^.\d]/g, ''))
                }
            }
            else if(orderPrice.children[0].textContent.trim() == "Coins" || orderPrice.children[0].textContent.trim() == "Coins credits"){
                console.log("coins")
                orderPriceData.coins += Number(orderPrice.children[1].textContent.replace(/[^.\d]/g, ''))*-1
            }
            else if(orderPrice.children[0].textContent.trim() == "Spend & save" || orderPrice.children[0].textContent.trim() == "AliExpress Saver coupon"){
                console.log("spend & save")
                orderPriceData.spendSave += Number(orderPrice.children[1].textContent.replace(/[^.\d]/g, ''))*-1
            }
            else if(orderPrice.children[0].textContent.trim() == "AliExpress Coupons"
            || orderPrice.children[0].textContent.trim() == "Promo codes" || orderPrice.children[0].textContent.trim() == "Store discounts" || orderPrice.children[0].textContent.trim() == "Store Coupon"){
                console.log("AliExpress Coupons, Promo codes")
                orderPriceData.discount += Number(orderPrice.children[1].textContent.replace(/[^.\d]/g, ''))*-1
            }
            else if(orderPrice.children[0].textContent.trim() == "Bonus" || orderPrice.children[0].textContent.trim() == "Payment discount" || orderPrice.children[0].textContent.trim() == "Shopping Credit"){
                console.log("Bonus")
                orderPriceData.bonus += Number(orderPrice.children[1].textContent.replace(/[^.\d]/g, ''))*-1
            }
            else if(orderPrice.children[0].textContent.trim() == "Total"){
                console.log("Total")
                orderPriceData.total += Number(orderPrice.children[1].textContent.replace(/[^.\d]/g, ''))
            }
            else{
                sendResponse({message: "Error: unknown order data", error: true})
                return
            }
        })

        console.log(orderPriceData);
        let itemInfoArray = [];
        const addedOrderPrice = {
            shipping: 0,
            coins: 0,
            spendSave: 0,
            discount: 0,
            bonus: 0,
            total: 0
        }

        console.log(orderItemsArray.length);

        for(let i=0;i<orderItemsArray.length;i++){
            console.log(i)
            const orderItem = orderItemsArray[i];
            const orderItemInfo = orderItem.getElementsByClassName("order-detail-item-content")[0].getElementsByClassName("order-detail-item-content-info")[0];
            const title = orderItemInfo.getElementsByClassName("item-title")[0].textContent;
            let variant = "";
            if(orderItemInfo.getElementsByClassName("item-sku-attr")[0]==null){
                variant = `""`;
            }
            else{
                variant = orderItemInfo.getElementsByClassName("item-sku-attr")[0].textContent;
            }
            const price = Number(orderItemInfo.getElementsByClassName("item-price")[0].children[0].textContent.replace(/[^.\d]/g, ''))
            const number = Number(orderItemInfo.getElementsByClassName("item-price")[0].children[1].textContent.replace(/[^.\d]/g, ''))
            const itemSubtotal = price * number;
            const itemPriceData = {
                shipping: 0,
                coins: 0,
                spendSave: 0,
                discount: 0,
                bonus: 0,
                total: 0
            }
            
            if(i==orderItemsArray.length-1){
                itemPriceData.shipping = orderPriceData.shipping - addedOrderPrice.shipping;
                itemPriceData.coins = orderPriceData.coins - addedOrderPrice.coins;
                itemPriceData.spendSave = orderPriceData.spendSave - addedOrderPrice.spendSave;
                itemPriceData.discount = orderPriceData.discount - addedOrderPrice.discount;
                itemPriceData.bonus = orderPriceData.bonus - addedOrderPrice.bonus;
                itemPriceData.total = itemSubtotal+itemPriceData.shipping+itemPriceData.coins+itemPriceData.spendSave+itemPriceData.discount+itemPriceData.bonus;
            }
            else{
                const ratio = itemSubtotal/orderPriceData.subtotal;
                itemPriceData.shipping = Math.round(ratio * orderPriceData.shipping);
                itemPriceData.coins = Math.round(ratio * orderPriceData.coins);
                itemPriceData.spendSave = Math.round(ratio * orderPriceData.spendSave);
                itemPriceData.discount = Math.round(ratio * orderPriceData.discount);
                itemPriceData.bonus = Math.round(ratio * orderPriceData.bonus);
                itemPriceData.total = itemSubtotal+itemPriceData.shipping+itemPriceData.coins+itemPriceData.spendSave+itemPriceData.discount+itemPriceData.bonus;
                addedOrderPrice.shipping += itemPriceData.shipping,
                addedOrderPrice.coins += itemPriceData.coins,
                addedOrderPrice.spendSave += itemPriceData.spendSave,
                addedOrderPrice.discount += itemPriceData.discount,
                addedOrderPrice.bonus += itemPriceData.bonus,
                addedOrderPrice.total += itemPriceData.total
            }

            console.log({
                orderId: `"${orderId}"`,
                orderDate: `"${orderDateString}"`,
                title: `"${title}"`,
                variant: `"${variant}"`,
                orderPrice: `"${price}"`,
                orderQuantity: `"${number}"`,
                numOfItems: `"1"`,
                subtotal: `"${itemSubtotal}"`,
                shipping: `"${itemPriceData.shipping}"`,
                coins: `"${itemPriceData.coins}"`,
                spendSave: `"${itemPriceData.spendSave}"`,
                discount: `"${itemPriceData.discount}"`,
                bonus: `"${itemPriceData.bonus}"`,
                itemTotal: `"${itemPriceData.total}"`,
                currency: `"${currency}"`,
                storeName: `"${storeName}"`
            })
            
            itemInfoArray.push({
                orderId: `"${orderId}"`,
                orderDate: `"${orderDateString}"`,
                title: `"${title}"`,
                variant: `"${variant}"`,
                orderPrice: `"${price}"`,
                orderQuantity: `"${number}"`,
                numOfItems: `"1"`,
                subtotal: `"${itemSubtotal}"`,
                shipping: `"${itemPriceData.shipping}"`,
                coins: `"${itemPriceData.coins}"`,
                spendSave: `"${itemPriceData.spendSave}"`,
                discount: `"${itemPriceData.discount}"`,
                bonus: `"${itemPriceData.bonus}"`,
                itemTotal: `"${itemPriceData.total}"`,
                currency: `"${currency}"`,
                storeName: `"${storeName}"`
            })
        }

        console.log(itemInfoArray)
        
        const outputArray = [];

        itemInfoArray.forEach(itemInfo=>{
            outputArray.push(Object.values(itemInfo));
        })

        // Send the scraped data to the output div in the popup
        sendResponse({message: "Copied!", data: outputArray});
    }
    else if(request.action === "scrapeAliBabaOrders"){

        const pageTitle = document.getElementsByClassName("page-title")[0]?.textContent;
        console.log(pageTitle);
        if(pageTitle != "Order details"){
            sendResponse({message: "This is not the Order Details Page!", error:true});
            return;
        }

        const orderInfo = {
            orderId: "",
            orderDate: "",
            title: "",
            variant: "",
            orderPrice: "",
            orderQuantity: "",
            numOfItems: "",
            subtotal: "",
            shipping: "",
            coins: "",
            spendSave: "",
            discount: "",
            bonus: "",
            itemTotal: "",
            currency: "",
            storeName: ""
        }
        const orderDiv = document.getElementsByClassName("order-info")[0];
        const orderID = orderDiv.children[0].textContent.replace(/\D/g,'');

        const dateString_raw = orderDiv.children[1].children[1].textContent;
        const orderDateObj = getDateObjFromAliBabaString(dateString_raw);
        const orderDate = getDateStringForCSV(orderDateObj);

        const orderArray = [];

        const detailProductContainer = document.getElementsByClassName("detail-product-info")[0];
        const storeName = '"' + detailProductContainer.getElementsByClassName("supplier-name")[0].children[1].textContent + '"';

        const orderSummaryContainer = document.getElementsByClassName("order-summary")[0].getElementsByClassName("order-summary-item");
        let orderSubTotal = 0, orderShippingTotal = 0, orderDiscountTotal = 0, orderTotal = 0;

        for(let i=0;i<orderSummaryContainer.length;i++){
            const orderSummaryItem = orderSummaryContainer[i];
            switch(orderSummaryItem.getElementsByClassName("order-summary-label")[0].textContent){
                case("Item subtotal"):
                    orderSubTotal = Number(orderSummaryItem.getElementsByClassName("order-summary-value")[0].textContent.replace(/[^0-9.]/g, ''));
                    console.log(orderSubTotal);
                    break;
                case("Shipping fee"):
                    orderShippingTotal = Number(orderSummaryItem.getElementsByClassName("order-summary-value")[0].textContent.replace(/[^0-9.]/g, ''));
                    console.log(orderShippingTotal);
                    break;
                case("Credit"):
                    orderDiscountTotal = -1 * Number(orderSummaryItem.getElementsByClassName("order-summary-value")[0].textContent.replace(/[^0-9.]/g, ''));
                    console.log(orderDiscountTotal);
                    break;
                case("Subtotal"):
                    orderTotal = Number(orderSummaryItem.getElementsByClassName("order-summary-value")[0].textContent.replace(/[^0-9.]/g, ''));
                    console.log(orderTotal);
                    break;
            }

            console.log(orderSubTotal,orderShippingTotal,orderDiscountTotal,orderTotal);
        }

        const productListArray = detailProductContainer.getElementsByClassName("next-table-body")[0].getElementsByClassName("next-table-row");
        let currTitle = ""
        for(let i=0;i<productListArray.length;i++){
            const newOrderDetails = {
                orderId: orderID,
                orderDate: orderDate,
                title: "",
                variant: "",
                orderPrice: "",
                orderQuantity: "",
                numOfItems: "",
                subtotal: "",
                shipping: "",
                coins: 0,
                spendSave: 0,
                discount: 0,
                bonus: 0,
                itemTotal: "",
                currency: '"$"',
                storeName: storeName
            }
            let productContainer = productListArray[i]
            console.log(productContainer)
            const productContainerClassNames = productContainer.classList;
            console.log(productContainerClassNames)
            if(productContainerClassNames.contains("first-product-row")){
                currTitle = productContainer.getElementsByClassName("first")[0].textContent;
            }
            newOrderDetails.title = '"' + currTitle + '"';
            newOrderDetails.variant = '"' + productContainer.getElementsByClassName("title")[0].textContent  + '"';
            newOrderDetails.orderPrice = Number(productContainer.getElementsByClassName("product-unitPrice-cell")[0].textContent.replace(/[^0-9.]/g, ''));
            newOrderDetails.orderQuantity = Number(productContainer.getElementsByClassName("product-quantity-cell")[0].textContent.replace(/[^0-9.]/g, ''));
            newOrderDetails.numOfItems = 1;
            newOrderDetails.subtotal = Number(productContainer.getElementsByClassName("product-subtotalPrice-cell")[0].textContent.replace(/[^0-9.]/g, ''));

            //calculate individual shipping cost
            const ratioOfValue = newOrderDetails.subtotal/orderSubTotal;
            const calcShippingCost = orderShippingTotal*ratioOfValue;
            newOrderDetails.shipping = Math.round(calcShippingCost*100)/100;

            //calculate individual discount cost
            const calcDiscountCost = orderDiscountTotal*ratioOfValue;
            newOrderDetails.discount = Math.round(calcDiscountCost*100)/100

            newOrderDetails.itemTotal = newOrderDetails.subtotal + newOrderDetails.shipping + newOrderDetails.discount

            console.log(newOrderDetails)
            orderArray.push(newOrderDetails)
        }

        const outputArray = [];

        orderArray.forEach(itemInfo=>{
            outputArray.push(Object.values(itemInfo));
        })

        // Send the scraped data to the output div in the popup
        sendResponse({message: "Copied!", data: outputArray});
    }
    else if(request.action === "scrapeAliBabaPayment"){

        const pageTitle = document.getElementsByClassName("localization-header")[0]?.children[1]?.textContent;
        if(pageTitle != "Transaction details"){
            sendResponse({message: "This is not the Transaction Details Page!",error:true});
            return;
        }


        const orderInfo = {
            total: 0,
            currency: "",
            conversionRateWithFee:1,
            orderID: ""
        }

        let subTotal = 0;
        let processingFee = 0;

        const transactionDetailCollection = document.getElementsByClassName("transaction-detail-localization-flex-item");
        for(let i=0;i<transactionDetailCollection.length;i++){
            const transactionItem = transactionDetailCollection[i];
            if(transactionItem.getElementsByClassName("label")[0].textContent=="Amount"){
                subTotal = Number(transactionItem.getElementsByClassName("value")[0].textContent.replace(/[^0-9.]/g, ''));
                const currencyStr = transactionItem.getElementsByClassName("value")[0].textContent.slice(0,3);
                console.log(currencyStr)
                switch(currencyStr){
                    case("JPY"): 
                        orderInfo.currency = "円";
                        break;
                    case("USD"): 
                        orderInfo.currency = "$";
                        break;
                }
            }
            else if(transactionItem.getElementsByClassName("label")[0].textContent=="Payment processing fee"){
                processingFee = Number(transactionItem.getElementsByClassName("value")[0].textContent.replace(/[^0-9.]/g, ''));
            }
        }

        orderInfo.total = subTotal + processingFee;

        orderInfo.orderID = document.getElementsByClassName("localization-list")[0].getElementsByClassName("localization-list-cell")[2].textContent.slice(1);
        const preConversionTotal = Number(document.getElementsByClassName("localization-list")[0].getElementsByClassName("localization-list-cell")[3].textContent.replace(/[^0-9.]/g, ''));

        orderInfo.conversionRateWithFee = orderInfo.total/preConversionTotal;

        // Send the scraped data to the output div in the popup
        sendResponse({message: "updated!", data: orderInfo});
    }
    else{
        sendResponse({message: "no"})
    }
});

const getDateObjFromAliExString = (dateStr) => {

    console.log(dateStr)
    let lastIndex = 0;
    let index = 0;
    let dateInfo = {
        year: 0,
        month: 0,
        date: 0,
        hour: 0,
        minute: 0
    }
    const monthName = dateStr.slice(0,3);
    dateInfo.month = monthNameToNumber[monthName];

    if(dateStr[4]==","){
        dateInfo.date = Number(dateStr.slice(3,4))
        dateInfo.year = Number(dateStr.slice(5,9))
    }
    else if (dateStr[5]==",") {
        dateInfo.date = Number(dateStr.slice(3,5))
        dateInfo.year = Number(dateStr.slice(6,10))
    } else {
        console.log("doesn't fit date string format")
        return 
    }

    console.log(dateInfo)
    return new Date(dateInfo.year,dateInfo.month,dateInfo.date,dateInfo.hour,dateInfo.minute)
}

const getDateObjFromAliBabaString = (dateStr) => {
    let dateInfo = {
        year: 0,
        month: 0,
        date: 0,
        hour: 0,
        minute: 0,
        second: 0
    }
    const yearIndex = dateStr.indexOf("-");
    dateInfo.year = Number(dateStr.slice(0,yearIndex).replace(/\D/g,''));
    dateStr = dateStr.slice(yearIndex+1);
    const monthIndex = dateStr.indexOf("-");
    dateInfo.month = Number(dateStr.slice(0,monthIndex).replace(/\D/g,''))-1;
    dateStr = dateStr.slice(monthIndex+1);
    const dayIndex = dateStr.indexOf(" ");
    dateInfo.date = Number(dateStr.slice(0,dayIndex).replace(/\D/g,''));
    dateStr = dateStr.slice(dayIndex+1);
    const hourIndex = dateStr.indexOf(":");
    dateInfo.hour = Number(dateStr.slice(0,hourIndex).replace(/\D/g,''));
    dateStr = dateStr.slice(hourIndex+1);
    const minuteIndex = dateStr.indexOf(":");
    dateInfo.minute = Number(dateStr.slice(0,minuteIndex).replace(/\D/g,''));
    dateStr = dateStr.slice(minuteIndex+1);
    dateInfo.second = Number(dateStr.replace(/\D/g,''));

    console.log(dateInfo)
    return new Date(dateInfo.year,dateInfo.month,dateInfo.date,dateInfo.hour,dateInfo.minute,dateInfo.second)
}

const getDateStringForCSV = (date) => {
    return date.getFullYear()+"/"+(date.getMonth()+1)+"/"+date.getDate()+" "+date.getHours()+":"+date.getMinutes()+":"+date.getSeconds();
}

const monthNameToNumber = {
    Jan: 0,
    Feb: 1,
    Mar: 2,
    Apr: 3,
    May: 4,
    Jun: 5,
    Jul: 6,
    Aug: 7,
    Sep: 8,
    Oct: 9,
    Nov: 10,
    Dec: 11
}