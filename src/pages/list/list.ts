import { Component } from '@angular/core';
import { NavController, LoadingController, AlertController, Platform, Events } from 'ionic-angular';
import { EditOrderPage } from '../editorder/editorder';
import { File } from '@ionic-native/file';
import { EmailComposer } from '@ionic-native/email-composer';
import { SQLite } from '@ionic-native/sqlite';
import { SqliteService } from '../../providers/sqlite-service';

import { ProductService } from '../../providers/product-service';

@Component({
  selector: 'page-list',
  templateUrl: 'list.html',
  providers: [SqliteService]
})
export class ListPage {
  private orders = [];
  private ordersFound = false;
  private source = "";

  constructor(private loadingCtrl: LoadingController, private navCtrl: NavController, private alertCtrl: AlertController, private file: File, private platform: Platform, private email: EmailComposer, private sqlite: SQLite, private sqlService: SqliteService, private productService: ProductService, private events: Events) {
    this.events.subscribe('source:value', (source)  => {
      this.source = source;
    });

    this.sqlite.create({
      name: 'salesone_tradeshows.db',
      location: 'default'
    })
    .then(_ => {
      //get Orders
      this.getList();
    })
    .catch(err => {
      alert("ERR: " + err.message);
    });
  }

  doRefresh(refresher) {setTimeout(() => {
      refresher.complete();
    }, 1500);
  }

  getOrder(ev: any){
    let searchString = ev.target.value;

    if(searchString && searchString.trim() != "") {
      this.orders = this.orders.filter((order) => {
        return (order['company_name'].toLowerCase().indexOf(searchString.toLowerCase()) > -1);
      });
    } else {
      this.getList();
    }
  }

  getList(){
    let loader = this.loadingCtrl.create({
      content: "Please wait...",
      duration: 3000
    });
    loader.present();

    this.sqlService.getList()
    .then(data => {
      if(data.rows.length > 0){
        this.ordersFound = true;

        for( var i=0; i < data.rows.length; i++){
          this.orders[i] = [];
          this.orders[i]['order_id'] = data.rows.item(i).order_id;
          this.orders[i]['customer_id'] = data.rows.item(i).customer_id;
          this.orders[i]['date_created'] = data.rows.item(i).date_created;
          this.orders[i]['contact_name'] = data.rows.item(i).contact_name;
          this.orders[i]['company_name'] = data.rows.item(i).company_name;
        }
      }
      else{
        let alert = this.alertCtrl.create({
          title: 'Order List',
          subTitle: 'No orders found.',
          buttons: ['Dismiss']
        });
        alert.present();
      }

      loader.dismiss();
    })
    .catch(err => {
      this.sqlService.logError(err.message);
    });
  }

  editOrder(order){
    this.navCtrl.push(EditOrderPage,{
      order_data: order
    });
  }

  exportOrder(orderId) {
    let loader = this.loadingCtrl.create({
      content: "Please wait...",
      duration: 3000
    });
    loader.present();
    
    this.sqlService.exportOrder(orderId)
    .then(data => {
      if(data.rows.length > 0){
          var header = Object.keys(data.rows.item(0));
          var orderData = header.join(",") + "\r\n";
          for( var i=0; i < data.rows.length; i++){
            var row = data.rows.item(i);
            var dataRow = Object.keys(row).map(function(rowIndex){
              var d = row[rowIndex];
              return d;
            });

            dataRow[5] = dataRow[5].replace(/\r?\n|\r/g, " ");
            dataRow[5] = dataRow[5].replace(/,/g, " ");
            dataRow[6] = dataRow[6].replace(/\r?\n|\r/g, " ");
            dataRow[6] = dataRow[6].replace(/,/g, " ");
            dataRow[16] = dataRow[16].replace(/\r?\n|\r/g, " ");
            dataRow[16] = dataRow[16].replace(/,/g, " ");
            orderData = orderData + dataRow.join(",") + "\r\n";
          }

          var dir: any;
          if(this.platform.is('android')){
            dir = this.file.externalRootDirectory;
          }
          else if(this.platform.is('ios')){
            dir = this.file.documentsDirectory;
          }

          //create dir ordertaking-export
          this.file.createDir(dir,"ordertaking-export",true)
          .then(_ => {
              var fileName = 'export-'+orderId+'.csv';
              this.file.writeFile(dir + "ordertaking-export", fileName, orderData, {replace:true})
              .then(_ => {
                  alert('File exported.');
                  loader.dismiss();
              })
              .catch(err => {
                alert(err.message);
                loader.dismiss();
              });
          })
          .catch(err => {
              this.sqlService.logError(err.message);
              loader.dismiss();
          });
      }
      else {
        alert("No orders found.");
      }
    });
  }

  export(){
    let loader = this.loadingCtrl.create({
      content: "Please wait...",
      duration: 3000
    });
    loader.present();

    this.sqlService.export()
    .then(data => {
      if(data.rows.length > 0){
          var header = Object.keys(data.rows.item(0));
          var orderData = header.join(",") + "\r\n";
          for( var i=0; i < data.rows.length; i++){
            var row = data.rows.item(i);
            var dataRow = Object.keys(row).map(function(rowIndex){
              var d = row[rowIndex];
              return d;
            });

            dataRow[5] = dataRow[5].replace(/\r?\n|\r/g, " ");
            dataRow[5] = dataRow[5].replace(/,/g, " ");
            dataRow[6] = dataRow[6].replace(/\r?\n|\r/g, " ");
            dataRow[6] = dataRow[6].replace(/,/g, " ");
            dataRow[16] = dataRow[16].replace(/\r?\n|\r/g, " ");
            dataRow[16] = dataRow[16].replace(/,/g, " ");
            orderData = orderData + dataRow.join(",") + "\r\n";
          }

          if(this.platform.is('android')){
            var dir = this.file.externalRootDirectory;
          }
          else if(this.platform.is('ios')){
            var dir = this.file.documentsDirectory;
          }

          //create dir ordertaking-export
          this.file.createDir(dir,"ordertaking-export",true)
          .then(_ => {
              var today = new Date();
              var year = today.getFullYear().toString();
              var month = today.getMonth().toString();
              var day = today.getDate().toString();
              var hr = today.getHours().toString();
              var min = today.getMinutes().toString();
              var sec = today.getSeconds().toString();
              var dtime = year + month + month + day + hr + min + sec;
              var fileName = 'export-'+dtime+'.csv';
              this.file.writeFile(dir + "ordertaking-export", fileName, orderData)
              .then(_ => {
                  alert('File exported.');
                  loader.dismiss();
              })
              .catch(err => {
                this.sqlService.logError(err.message);
                loader.dismiss();
              });
          })
          .catch(err => {
              this.sqlService.logError(err.message);
              loader.dismiss();
          });
      }
      else {
        alert("No orders found.");
      }
    });
  }

  async sync(){
    let data: any = [];

    /*get customers*/
    let customers = await this.sqlService.getAllCustomers();
    data['customers'] = [];
    for(let index = 0; index < customers.rows.length; index++){
      data['customers'][index] = [];
      data['customers'][index] = customers.rows.item(index);
    }

    /*get orders*/
    let orders = await this.sqlService.getAllOrders();
    data['orders'] = [];
    for(let index = 0; index < orders.rows.length; index++){
      data['orders'][index] = [];
      data['orders'][index] = orders.rows.item(index);
    }

    /*get order details*/
    let details = await this.sqlService.getAllOrderDetails();
    data['details'] = [];
    for(let index = 0; index < details.rows.length; index++){
      data['details'][index] = [];
      data['details'][index] = details.rows.item(index);
    }
          
    if(Object.keys(data).length > 0) {
      data['source'] = this.source;
      /*start sync process*/
      let result = await this.productService.sync(data);
      /*sync result*/
      var len = Object.keys(result).length;
      if(len > 0) {
        for(let index = 0; index < len; index++) {
            await this.sqlService.syncData(result[index]);
        }
        /*set source for us to know if data is already sync*/
        await this.sqlService.updateSource(this.source);
      }
      alert('Synchronization successful.');
    }
  }
}
