import { Component  } from '@angular/core';
import { NavController, PopoverController, Events, AlertController, Platform  } from 'ionic-angular';
import { Network } from '@ionic-native/network';
import { BarcodeScanner } from '@ionic-native/barcode-scanner';
import { PopoverPage } from '../popover/popover';
import { CustomerInfoPage } from '../customerinfo/customerinfo';
import { SQLite } from '@ionic-native/sqlite';
import { SqliteService } from '../../providers/sqlite-service';
import { getLocaleWeekEndRange } from '@angular/common/src/i18n/locale_data_api';

@Component({
  selector: 'page-home',
  templateUrl: 'home.html',
  providers: [SqliteService]
})
export class HomePage {
  private orderData: any;
  public product = [];
  public rowNumber = 0;
  private index = 0;
  private grand_total = 0;
  private totDiscount: any = 0;
  private subTotal = 0;
  private hasOrder = false;
  private totQty = 0;
  private defaultDiscount = 0;
  private discountedOrder = false;
  private customer_info = [];
  private title = "";
  private save;
  private source = "";

  constructor(public navCtrl: NavController, private barcodeScanner: BarcodeScanner, public popoverCtrl: PopoverController, private events: Events, private network: Network, private alertCtrl: AlertController, private sqlite: SQLite, private sqlService: SqliteService, private platform: Platform ) {
    this.orderData = [];
    this.title = "Order Taking";
    this.save = true;

    this.events.subscribe('row:edited', (row,qty,disc_rate,page)  => {
      if(page == "home"){
        this.edit(row,qty,disc_rate,page);
      }
    });

    this.events.subscribe('row:deleted', (row,page)  => {
      if(page == "home"){
        this.delete(row,page);
      }
    });

    //set customer info
    this.events.subscribe('info:inputted', (info)  => {
      this.customer_info = info;
    });

    this.events.subscribe('source:value', (source)  => {
      this.source = source;
    });

    this.sqlite.create({
      name: 'salesone_tradeshows.db',
      location: 'default'
    })
  }

  doRefresh(refresher) {setTimeout(() => {
      location.reload();
    }, 500);
  }

  presentPopover(myEvent, rowNumber) {
    let popover = this.popoverCtrl.create(PopoverPage,
      {
        row : rowNumber,
        page: "home"
      }
    );
    popover.present({
      ev: myEvent,
    });
  }

  cancelOrder(){
    if(confirm("Cancel order?")){
      this.clear();
    }
  }

  clear(){
    this.product = [];
    this.rowNumber = 0;
    this.index = 0;
    this.grand_total = 0;
    this.subTotal = 0;
    this.totDiscount = 0;
    this.hasOrder = false;
    this.totQty = 0;
    this.defaultDiscount = 0;
    this.discountedOrder = false;
  }

  finishOrder(){
    if(this.customer_info.length < 1){
      alert("Please enter customer information.");
    }
    else{
      let data = {
        customer: this.customer_info,
        tot_discount : this.totDiscount,
        tot_qty : this.totQty,
        order_total : this.grand_total,
        default_disc: this.defaultDiscount,
        product: this.product,
        index: this.index,
        source: this.source
      };

      this.sqlService.finishOrder(data)
      .then(res => {
          alert("Thank you for shopping with us!");
          this.product = [];
          this.rowNumber = 0;
          this.index = 0;
          this.grand_total = 0;
          this.subTotal = 0;
          this.totDiscount = 0;
          this.hasOrder = false;
          this.totQty = 0;
          this.customer_info = [];
          //location.reload();
      }).
      catch(err => {
        this.sqlService.logError(err.message);
      });
    }
  }

  scanItem(alwaysShow){
      this.barcodeScanner.scan()
      .then((barcodeData) => {
          var code = barcodeData.text;
          
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

  setItem(qty, disc_rate, data){
    this.rowNumber++;
    this.hasOrder = true;
    let subtotal = qty * data[0].price;

    this.product[this.index] = [];

    let discount: any = 0;
    this.product[this.index]['disc_rate'] = 0;
    if(disc_rate != 0) {
      discount = data[0].price * (disc_rate / 100);
      this.product[this.index]['disc_rate'] = disc_rate;
    }

    subtotal = subtotal - (discount.toFixed(2) * qty);
    
    this.product[this.index]['sku'] = data[0].sku;
    this.product[this.index]['qty'] = qty;
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

  searchItemByItemCode(itemCode)
  {
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

  edit(row,qty,disc_rate,page){
    if(page == "home"){
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
      let subtotal = discountedAmount * qty;

      this.product[row-1]['price_disp'] = iPrice + (disc_rate != 0 ? " (-" + disc_rate + "%)" : "");  
      this.product[row-1]['discounted'] = discountedAmount;
      this.product[row-1]['subtotal'] = subtotal.toFixed(2);
      
      this.calculateTotal();

      this.product[row-1]['disc_rate'] = disc_rate;
    }
  }
  delete(row,page){
    if(page == "home"){
      console.log(this.product);
      this.totQty -= this.product[row-1]['qty'];

      this.rowNumber--;
      if(this.rowNumber == 0){
        this.hasOrder = false;
      }
      this.index--;

      if ((row-1) != -1) {
         this.product.splice((row-1), 1);

         this.calculateTotal();
      }
    }
  }

  openCustomerContact(){
    this.navCtrl.push(CustomerInfoPage,{
      info: this.customer_info
    });
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
}
