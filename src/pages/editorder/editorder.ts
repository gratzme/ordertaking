import { Component } from '@angular/core';
import { NavController, NavParams, Events, PopoverController, Platform, AlertController } from 'ionic-angular';
import { BarcodeScanner } from '@ionic-native/barcode-scanner';
import { CustomerInfoPage } from '../customerinfo/customerinfo';
import { PopoverPage } from '../popover/popover';
import { SQLite } from '@ionic-native/sqlite';
import { SqliteService } from '../../providers/sqlite-service';

//navigation page
@Component({
  selector: 'page-editorder',
  templateUrl: '../home/home.html',
  providers: [SqliteService]
})
export class EditOrderPage{
  private orderData: any = [];
  public product = [];
  public rowNumber = 0;
  private index = 0;
  private grand_total = 0;
  private subTotal = 0;
  private totDiscount: any = 0;
  private hasOrder = false;
  private totQty = 0;
  private defaultDiscount = 0;
  private discountedOrder = false;
  private customer_info = [];
  private title = "";
  private save;
  private prodQty = 1;
  private prodDiscRate = 0;
  private inputted: any;
  private source = "";

  constructor(private navCtrl: NavController, private params: NavParams, private events: Events, public popoverCtrl: PopoverController, private barcodeScanner: BarcodeScanner, private sqlite: SQLite, private sqlService: SqliteService, private platform: Platform, private alertCtrl: AlertController){
    this.title = "Edit Order #";
    this.save = false;

    this.orderData = this.params.data.order_data;

    //set customer info
    this.events.subscribe('info:inputted', (info)  => {
      this.customer_info = info;
    });

    this.events.subscribe('row:edited', (row,qty,disc_rate,page)  => {
      if(page == "edit"){
        this.edit(row,qty,disc_rate,page);
      }
    });

    this.events.subscribe('row:deleted', (row,page)  => {
      if(page == "edit"){
        this.delete(row,page);
      }
    });

    this.events.subscribe('source:value', (source)  => {
      this.source = source;
    });

    this.sqlite.create({
      name: 'salesone_tradeshows.db',
      location: 'default'
    })
    .then(_ => {
      this.getOrderDetails();
    })
    .catch(err => {
      alert("ERR: "+err.message);
    });
  }

  calculateTotal() {
    this.subTotal = 0;
    for(var i in this.product){
      let iPrice = this.product[i]['price'];
      this.subTotal += parseFloat(this.product[i]['discounted']) * this.product[i]['qty'];
    }

    if(this.defaultDiscount != 0) {
      this.grand_total = this.subTotal - (this.subTotal * (this.defaultDiscount / 100));
      this.totDiscount = this.subTotal - this.grand_total;
    } else {
      this.grand_total = this.subTotal
      this.totDiscount = 0;
    }
  }

  getOrderDetails(){
    var orderId = this.orderData.order_id;
    this.sqlService.getOrderDetails(orderId)
    .then(data => {
      if(data.rows.length > 0){
        this.hasOrder = true;
        for( var i=0; i < data.rows.length; i++){
          this.rowNumber++;
          
          let qty = data.rows.item(i).qty;
          let subtotal = qty * data.rows.item(i).price;

          this.defaultDiscount = data.rows.item(i).default_discount;

          this.product[this.index] = [];
          let discount: any = 0;
          this.product[this.index]['disc_rate'] = 0;
          if(data.rows.item(i).discount_rate != 0) {
            discount = data.rows.item(i).price * (data.rows.item(i).discount_rate / 100);
            this.product[this.index]['disc_rate'] = data.rows.item(i).discount_rate;
          }
          
          subtotal = subtotal - (discount.toFixed(2) * qty);
          this.product[this.index]['rec_id'] = data.rows.item(i).rec_id;
          this.product[this.index]['position'] = data.rows.item(i).position;
          this.product[this.index]['sku'] = data.rows.item(i).sku;
          this.product[this.index]['qty'] = qty;
          this.product[this.index]['qty_available'] = data.rows.item(i).qty_available;
          this.totQty += parseInt(qty);
          this.product[this.index]['price'] = data.rows.item(i).price;
          this.product[this.index]['price_disp'] = data.rows.item(i).price + (data.rows.item(i).discount_rate != 0 && data.rows.item(i).discount_rate != null ? " (-" + data.rows.item(i).discount_rate + "%)" : "");    
          this.product[this.index]['subtotal'] = subtotal.toFixed(2);
          this.product[this.index]['discounted'] = data.rows.item(i).price - discount.toFixed(2);

          //set customer info
          if(this.customer_info.indexOf(0) == -1) {
            this.customer_info = [
              data.rows.item(i).contact_name,data.rows.item(i).company_name,data.rows.item(i).company_phone,data.rows.item(i).customer_email,
              data.rows.item(i).customer_shipping,data.rows.item(i).customer_billing,data.rows.item(i).order_notes,
              data.rows.item(i).source
            ];
          }

          this.index++;
        }
        
        this.calculateTotal();
      }
      else{
        alert("Order details not found.");
      }
    })
    .catch(err => {
        console.log("Error loading order details: " + err.message);
        this.sqlService.logError(err.message);
    });
  }

  openCustomerContact(){
    this.navCtrl.push(CustomerInfoPage,{
      info: this.customer_info
    });
  }

  updateOrder(orderId){
    if(this.customer_info.length < 1){
      alert("Please enter customer information.");
    }
    else{
      //update customer order
      let data = {
        customer: this.customer_info,
        tot_discount : this.totDiscount,
        tot_qty : this.totQty,
        order_total : this.grand_total,
        default_disc: this.defaultDiscount,
        product: this.product,
        order_id: orderId,
        customer_id: this.orderData.customer_id,
        index: this.index,
        source: this.source
      };

      this.sqlService.updateOrder(data)
      .then(res => {
          alert("Thank you for shopping with us!");
          //this.product = [];
          this.rowNumber = 0;
          this.index = 0;
          this.grand_total = 0;
          this.subTotal = 0;
          this.totDiscount = 0;
          this.hasOrder = false;
          this.totQty = 0;
          this.defaultDiscount = 0;
          this.navCtrl.pop();
          //location.reload();
      })
      .catch(err => {
        console.log("Error updating customer_info: " + err.message);
        this.sqlService.logError(err.message);
      });
    }
  }

  edit(row,qty,disc_rate,page){
    if(page == "edit"){
      var item = this.product[row-1];
      if(item != null) {
        let currQty = this.product[row-1]['qty'];

        if(currQty <= qty){
          this.totQty += qty - currQty;
        }
        else{
          this.totQty -= currQty - qty;
        }
        this.product[row-1]['qty'] = qty;

        let iPrice = this.product[row-1]['price'];
        let discount: any = 0;
        if(disc_rate != 0) {
          discount = iPrice * (disc_rate / 100);
        }

        let discountedAmount = iPrice - discount.toFixed(2);

        let currSub = this.product[row-1]['subtotal'];
        let subtotal = discountedAmount * this.product[row-1]['qty'];

        this.product[row-1]['price_disp'] = iPrice + (disc_rate != 0 ? " (-" + disc_rate + "%)" : "");  
        this.product[row-1]['discounted'] = discountedAmount;
        this.product[row-1]['subtotal'] = subtotal.toFixed(2);
        
        this.calculateTotal();

        this.product[row-1]['disc_rate'] = disc_rate;
      }
    }
  }
  delete(row,page){
    if(page == "edit"){
      this.totQty -= this.product[row-1]['qty'];

      this.rowNumber--;
      if(this.rowNumber == 0){
        this.hasOrder = false;
      }
      this.index--;

      if ((row-1) !== -1) {
         this.product.splice((row-1), 1);

         this.calculateTotal();
      }
    }
  }

  scanItem(alwaysShow){
      this.barcodeScanner.scan()
      .then((barcodeData) => {
          if(this.platform.is('android')){
            var code = barcodeData.text;
          }
          else if(this.platform.is('ios')){
            var code = barcodeData.text.substring(1);
          }
          this.sqlService.scanItem(code)
          .then(data => {
              let d: any = [];
              d[0] = data.rows.item(0);
              if(data.rows.length){
                this.getInputs(d);
              }
              else{
                alert("Item not found! Barcode is: " + code);
              }
          })
          .catch(err => {
              alert("ERR: " + err);
          });
      });
  }

  getInputs(d) {
    let alert = this.alertCtrl.create({
      title: '',
      inputs: [
        {
          name: 'qty',
          placeholder: 'Qty',
          type: 'number'
        },
        {
          name: 'disc_rate',
          placeholder: 'Item Discount (%)',
          type: 'number'
        }
      ],
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
          handler: data => {
            console.log('Cancel clicked');
          }
        },
        {
          text: 'OK',
          handler: data => {
            let qty: any = 1;
            let disc_rate: any = 0;

            if(data.qty != "") {
              qty = data.qty;
            }
            if(data.disc_rate != "") {
              disc_rate = data.disc_rate;
            }
            
            this.setItem(qty, disc_rate, d);
          }
        }
      ]
    });
    alert.present();
}

  searchItemByItemCode(itemCode) {
      this.sqlService.searchItemByItemCode(itemCode.value)
      .then(data => {
          let d: any = [];
          d[0] = data.rows.item(0);
          if(data.rows.length){
            this.getInputs(d);
          }
          else{
            alert("Item not found!");
          }
      })
      .catch(err => {
          alert("ERR: " + err);
      });
  }

  setItem(qty, disc_rate, data){
    this.rowNumber++;
    this.hasOrder = true;
    let subtotal = qty * data[0].price;
    
    this.product[this.index] = [];
    let discount: any = 0;
    if(disc_rate != 0) {
      discount = data[0].price * (disc_rate / 100);
      this.product[this.index]['disc_rate'] = disc_rate;
    }

    subtotal = subtotal - (discount.toFixed(2) * qty);
    this.product[this.index]['sku'] = data[0].sku;
    this.product[this.index]['qty'] = qty;
    this.product[this.index]['position'] = this.product[this.index-1]['position'] + 1;
    this.product[this.index]['qty_available'] = data[0].qty_available;
    this.totQty += qty;
    this.product[this.index]['price'] = data[0].price;
    this.product[this.index]['price_disp'] = data[0].price + (disc_rate != 0 ? " (-" + disc_rate + "%)" : "");    
    this.product[this.index]['subtotal'] = subtotal.toFixed(2);
    this.product[this.index]['discounted'] = data[0].price - discount.toFixed(2);
    
    this.calculateTotal();

    this.index++;
    return;
  }

  applyDefaultDiscount(discountField){
    if(this.defaultDiscount != discountField.value.trim()){
      if(discountField.value.trim() != ""){
        this.defaultDiscount = parseFloat(discountField.value);
        this.discountedOrder = true;
      }
      else{
        this.defaultDiscount = 0;
        discountField.value = 0;
        this.discountedOrder = false;
      }

      if(this.subTotal != 0) {
        this.calculateTotal();
      }
    }
  }

  presentPopover(myEvent, rowNumber) {
    let popover = this.popoverCtrl.create(PopoverPage,
      {
        row : rowNumber,
        page: "edit"
      }
    );
    popover.present({
      ev: myEvent,
    });
  }

  cancelOrder(){
    if(confirm("Cancel order?")){
      //cancel order
    }
  }

  doRefresh(refresher) {setTimeout(() => {
      refresher.complete();
    }, 1500);
  }
}
