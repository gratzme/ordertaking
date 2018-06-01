import { Component, ViewChild } from '@angular/core';
import { Nav, Platform, Events } from 'ionic-angular';
import { StatusBar } from '@ionic-native/status-bar';
import { SplashScreen } from '@ionic-native/splash-screen';

import { HomePage } from '../pages/home/home';
import { ListPage } from '../pages/list/list';

import { SQLite } from '@ionic-native/sqlite';

import { ProductService } from '../providers/product-service';

import { LoadingController } from 'ionic-angular';

@Component({
  templateUrl: 'app.html',
  providers: [ProductService]
})
export class MyApp {
  @ViewChild(Nav) nav: Nav;

  rootPage: any = HomePage;
  public db = null;

  pages: Array<{title: string, component: any}>;

  constructor(public platform: Platform, public statusBar: StatusBar, public splashScreen: SplashScreen, private sqlite: SQLite, private productService: ProductService, public loadingCtrl: LoadingController, private events: Events) {
    this.initializeApp();
    
    // used for an example of ngFor and navigation
    this.pages = [
      { title: 'Order Taking', component: HomePage },
      { title: 'Order List', component: ListPage }
    ];

  }

  initializeApp() {
    this.platform.ready().then(() => {
      // Okay, so the platform is ready and our plugins are available.
      // Here you can do any higher level native things you might need.
      this.statusBar.styleDefault();
      this.splashScreen.hide();

      if(confirm("Import product database?")) {
        this.sqlite = new SQLite();
        this.sqlite.create({
          name: 'salesone_tradeshows.db',
          location: 'default'
        })
        .then((db: any) => {
            let loading = this.loadingCtrl.create({
              content: 'Importing product database. Please wait...'
            });
          
            loading.present();

            //create table orders
            db.executeSql('CREATE TABLE IF NOT EXISTS orders (order_id integer primary key,r_order_id integer, date_created numeric,date_updated numeric, customer_id integer, total_discount numeric, total_qty integer, order_total numeric, order_notes text, default_discount numeric, source text, modified integer)', {})
            .then(_ => {
              console.log("executed create orders");
            })
            .catch(err => {
              console.log(err);
            });

            //create table order_details
            db.executeSql('CREATE TABLE IF NOT EXISTS order_details (rec_id integer primary key, r_order_id integer, position integer, order_id integer, sku text, price numeric, qty integer, discount_rate numeric, discounted_amt numeric, source text, modified integer)', {})
            .then(_ => {
              console.log("executed create order_details");
            })
            .catch(err => {
              console.log(err);
            });

            //create table customer_info
            db.executeSql("CREATE TABLE IF NOT EXISTS customer_info (customer_id integer primary_key, r_order_id integer, order_id integer, contact_name text, company_name text, company_phone text, customer_email text, customer_shipping text, customer_billing text, source text, modified integer)", {})
            .then(_ => {
              console.log("executed create customer_info");
            })
            .catch(err => {
              console.log(err);
            });

            //create table product_upc_codes
            db.executeSql("CREATE TABLE IF NOT EXISTS product_upc_codes (prod_id integer primary key, sku text, category text, description text, barcode text, price numeric, qty_available integer, image_name text, brand text, gender text, warehouse text, prodline text, bin text)", {})
            .then(_ => {
              console.log("executed create product_upc_codes");
            })
            .catch(err => {
              console.log(err);
            });

            //get insert data from api
            this.productService.getProductData()
            .subscribe(insertdata => {
                let query = "INSERT OR IGNORE INTO product_upc_codes VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)";
                var num = 0;
                let inserts = [];
                for(let data of insertdata){
                  let arr = [];
                  let id: number = parseInt(data.id);
                  let p: any = parseFloat(data.price);
                  let q: number = parseInt(data.qtyAvailable);
                  arr = [
                    id,
                    data.sku.trim(),
                    data.category,
                    data.description,
                    data.barcode.trim(),
                    p,
                    q,
                    data.imageName,
                    data.brand,
                    data.gender,
                    data.warehouse,
                    data.prodline,
                    data.bin
                  ];

                  inserts[num] = [query, arr];
                  num++;
                }
                
                db.sqlBatch(inserts)
                .then(_ => {
                    alert("Product database imported.");
                    loading.dismiss();

                    /*var source = "";
                    while(source == "") {
                      source = prompt("Please enter your code:");
                    }
                    this.events.publish('source:value',source);*/
                })
                .catch(err => {
                    alert("Error inserting products: "+ err.message);
                });
                //create table error_log
                db.executeSql("CREATE TABLE IF NOT EXISTS error_log (recid integer primary key, date_error numeric, error text)", {})
                .then(_ => {
                  console.log("Executed SQL");
                })
                .catch(err => {
                  console.log("Error creating table error_log");
                });
            });
        })
        .catch(err => {
          console.log(err);
        });
      }
    });
  }

  openPage(page) {
    // Reset the content nav to have just this page
    // we wouldn't want the back button to show in this scenario
    this.nav.setRoot(page.component);
  }
}
