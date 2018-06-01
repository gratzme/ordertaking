import { Injectable } from '@angular/core';
import 'rxjs/add/operator/map';
import { SQLite } from '@ionic-native/sqlite';

declare var window : any;

@Injectable()
export class SqliteService {

  private conn: any;
  private i: any;
  private bind = [];
  private cusId = 0;
  private orId = 0;
  private email = "";

  constructor(private sqlite: SQLite) {
    this.sqlite.create({
      name: 'salesone_tradeshows.db',
      location: 'default'
    })
    .then((db: any) => {
      this.conn = db;
    })
    .catch(err => {
      alert("Error opening database: " + err.message);
    });
  }

  getOrderDetails(orderId) {
      return this.conn.executeSql(`SELECT od.rec_id,position,o.order_id,date_created,contact_name,company_name,company_phone,customer_email,customer_shipping,
      				customer_billing,total_discount,order_total,order_notes,default_discount,od.sku,od.price,qty,discount_rate,qty_available,discounted_amt, c.source
      			FROM orders o
      			LEFT JOIN order_details od
      				ON od.order_id = o.order_id
      			LEFT JOIN product_upc_codes p
      				ON p.sku = od.sku
      			LEFT JOIN customer_info c
              ON (c.customer_id = o.customer_id AND c.order_id = o.order_id)
      			WHERE o.order_id = ?
      			ORDER BY date_created DESC
      `,[orderId])
      .then(res => {
        return res;
      })
      .catch(err => {
        console.log("error selecting order_details. " + err.message);
        this.logError(err.message);
        return false;
      });
  }

  updateOrder(data){
      return this.conn.executeSql(`
          UPDATE customer_info set
          contact_name = ?,
          company_name = ?,
          company_phone = ?,
          customer_email = ?,
          customer_shipping = ?,
          customer_billing = ?,
          modified = ?
          WHERE order_id = ? AND customer_id = ?
      `,
      [
        data.customer[0],data.customer[1],data.customer[2],data.customer[3],data.customer[4],
        data.customer[5],1,data.order_id,data.customer_id
      ])
      .then(_ => {
          console.log("customer_info updated.");

          //update orders
          this.conn.executeSql(`
              UPDATE orders SET
              total_discount = ?,
              total_qty = ?,
              order_total = ?,
              order_notes = ?,
              default_discount = ?,
              modified = ?
              WHERE order_id = ? AND customer_id = ?
          `,
          [
              data.tot_discount,data.tot_qty,data.order_total,data.customer[6],data.default_disc,1,data.order_id,data.customer_id
          ])
          .then(_ => {
              console.log("orders updated.");

              this.i = 0;
              this.updateOrderDetail(data);

              return true;
          })
          .catch(err => {
              console.log("Error updating orders: " + err.message);
              this.logError(err.message);
              return false;
          });
      })
      .catch(err => {
        console.log("Error updating customer_info. " + err.message);
        this.logError(err.message);
        return false;
      })
  }

  updateOrderDetail(data){
      var i = this.i;
      this.bind[i] = [data.product[i]['position']];

      //get current qty
      this.conn.executeSql("SELECT qty FROM order_details WHERE order_id = ? AND sku = ? AND position = ?",
      [data.order_id,data.product[i]['sku'],data.product[i]['position']])
      .then(res => {
          var currQty = 0;
          if(res.rows.length > 0)
          {
              currQty = res.rows.item(0).qty;

              //update order item/s
              this.conn.executeSql(`
                  UPDATE order_details SET
                  price = ?,
                  qty = ?,
                  discount_rate = ?,
                  discounted_amt = ?,
                  modified = ?
                  WHERE order_id = ? AND sku = ? AND position = ?
              `,
              [
                data.product[i]['price'],data.product[i]['qty'],data.product[i]['disc_rate'],data.product[i]['discounted'],1,
                data.order_id,data.product[i]['sku'],data.product[i]['position']
              ])
              .then(res => {
                  if(res.rowsAffected > 0)
                  {
                      //update qty_available
                      if(currQty < data.product[i]['qty']) {
                        var diff = data.product[i]['qty'] - currQty;
                        var query = "UPDATE product_upc_codes SET qty_available = (qty_available - ?) WHERE sku = ?";
                      }
                      else {
                        var diff = currQty - data.product[i]['qty'];
                        var query = "UPDATE product_upc_codes SET qty_available = (qty_available + ?) WHERE sku = ?";
                      }

                      this.conn.executeSql(query,[diff,data.product[i]['sku']])
                      .then(_ => {
                          console.log("qty_available updated. ");

                          if(this.i < data.index-1) {
                              this.i++
                              this.updateOrderDetail(data);
                          }
                          else{
                            this.conn.executeSql('SELECT * FROM order_details WHERE position IN (?) AND order_id = ?', [this.bind,data.order_id])
                            .then(res => {
                              console.log("to be deleted: " + res.rows.length);
                              return true;
                            })
                            .catch(err => {
                              console.log(err.message);
                              return true;
                            });
                              //this.conn.executeSql("DELETE FROM order_details WHERE position NOT IN (?) AND order_id = ?",[this.added,data.order_id])
                              //.then(res => {
                                //console.log(res);
                                //return true;
                              //})
                              //.catch(err => {
                                //console.log("error deleting item in order_details table. " + err.message);
                                //return false;
                              //});
                          }
                      })
                      .catch(err => {
                        console.log("Error updating qty_available: sku " + data.product[i]['sku']);
                        this.logError(err.message);
                        return false;
                      });
                  }
              })
              .catch(err => {
                console.log("Error updating order details. " + err.message);
                this.logError(err.message);
                return false;
              });
          }
          else {
              //get last insert id for orders_details
              this.conn.executeSql("SELECT rec_id FROM order_details ORDER BY rec_id DESC LIMIT 1", {})
              .then(res => {
                  let recId: any;
                  if(res.rows.length > 0){
                    recId = res.rows.item(0).rec_id + 1;
                  }
                  else{
                    recId = 0;
                  }

                  var source = "";
                  if(data.customer[7] ! ="") {
                    source = data.customer[7];
                  }            

                  let insertQuery = "INSERT INTO order_details(rec_id,position,order_id,sku,price,qty,discount_rate,discounted_amt,source) VALUES (?,?,?,?,?,?,?,?,?)";
                  this.conn.executeSql(insertQuery,[
                    recId,data.product[i]['position'],data.order_id,data.product[i]['sku'],data.product[i]['price'],data.product[i]['qty'],data.product[i]['disc_rate'],data.product[i]['discounted'],data.source
                  ])
                  .then(res => {
                      console.log("new item inserted. ");

                      //update product stock on hand
                      this.conn.executeSql("UPDATE product_upc_codes SET qty_available = (qty_available - ?) WHERE sku = ?",[
                        data.product[i]['qty'],data.product[i]['sku']
                      ])
                      .then(_ => {
                          console.log("successfully update stock: " + data.product[i]['sku']);

                          if(this.i < data.index-1) {
                              this.i++
                              this.updateOrderDetail(data);
                          }
                          else{
                            this.conn.executeSql("SELECT * FROM order_details WHERE position IN (?) AND order_id = ?", [this.bind,data.order_id])
                              .then(res => {
                                console.log("to be deleted: " + res.rows.length);
                                return true;
                              })
                              .catch(err => {
                                console.log(err.message);
                                return true;
                              });
                              //this.conn.executeSql("DELETE FROM order_details WHERE position NOT IN (?) AND order_id = ?",[this.added,data.order_id])
                            //  .then(res => {
                              //  console.log(res);
                                //return true;
                            //  })
                            //  .catch(err => {
                            //    console.log("error deleting item in order_details table. " + err.message);
                            //    return false;
                            //  });
                          }
                      })
                      .catch(err => {
                        console.log("error updating product_upc stock on hand. " + err.message);
                        this.logError(err.message);
                        return false;
                      })
                  })
                  .catch(err => {
                    console.log("Error adding product: " + data.product[i]['sku']);
                    this.logError(err.message);
                    return false;
                  });
              })
              .catch(err => {
                console.log("Error reading order_details table. " + err.message);
                this.logError(err.message);
                return false;
              });
          }
      })
      .catch(err => {
        console.log("Error reading order_details table. " + err.message);
        this.logError(err.message);
        return false;
      });
  }

  searchItemByItemCode(itemCode){
     return this.conn.executeSql("SELECT sku,price,qty_available FROM product_upc_codes WHERE LOWER(sku) = LOWER(?)",[itemCode])
        .then(res => {
          return res;
        })
        .catch(err => {
          console.log("error selecting product. " + err.message);
          this.logError(err.message);
          return false;
        });
  }

  scanItem(barcode){
      return this.conn.executeSql("SELECT sku,price,qty_available FROM product_upc_codes WHERE barcode = ?",[barcode])
        .then(res => {
            return res;
        })
        .catch(err => {
          alert("error selecting barcode. " + err.message);
          this.logError(err.message);
          return false;
        });
  }

  getList(){
    return this.conn.executeSql(`
          SELECT o.order_id,o.customer_id,date_created,contact_name,company_name
          FROM orders o
          LEFT JOIN customer_info c
            ON c.customer_id = o.customer_id
          ORDER BY date_created DESC
      `, {})
      .then(res => {
        return res;
      })
      .catch(err => {
        console.log("Error getting order list. " + err.message);
        this.logError(err.message);
        return false;
      });
  }

  exportOrder(orderId){
    return this.conn.executeSql(`
          SELECT 
            o.order_id,
            contact_name,
            company_name,
            company_phone,
            customer_email,
            customer_shipping,
            customer_billing,
            od.sku as item_code,
            description as item_description,
            qty as item_qty,
            od.price as item_price,
            discount_rate as ld,
            discounted_amt as ext_price,
            (discounted_amt * qty) as subtotal,
            default_discount AS td,
            order_total as grand_total,
            order_notes
            FROM orders AS o
          LEFT JOIN order_details AS od
            ON (od.order_id = o.order_id)
          LEFT JOIN customer_info AS cus
            ON (cus.customer_id = o.customer_id AND cus.order_id = o.order_id)
          LEFT JOIN product_upc_codes AS p
            ON (p.sku = od.sku)
          WHERE o.order_id = ?
          ORDER BY date_created DESC
      `, [orderId])
      .then(res => {
        return res;
      })
      .catch(err => {
        console.log("Error getting order details for export. " + err.message);
        this.logError(err.message);
        return false;
      });
  }

  export(){
    return this.conn.executeSql(`
          SELECT 
            o.order_id,
            contact_name,
            company_name,
            company_phone,
            customer_email,
            customer_shipping,
            customer_billing,
            od.sku as item_code,
            description as item_description,
            qty as item_qty,
            od.price as item_price,
            discount_rate as ld,
            discounted_amt as ext_price,
            (discounted_amt * qty) as subtotal,
            default_discount AS td,
            order_total as grand_total,
            order_notes
          FROM orders AS o
          LEFT JOIN order_details AS od
            ON (od.order_id = o.order_id)
          LEFT JOIN customer_info AS cus
            ON (cus.customer_id = o.customer_id AND cus.order_id = o.order_id)
          LEFT JOIN product_upc_codes AS p
            ON (p.sku = od.sku)
          ORDER BY date_created DESC
      `, {})
      .then(res => {
        return res;
      })
      .catch(err => {
        console.log("Error getting order details for export. " + err.message);
        this.logError(err.message);
        return false;
      });
  }

  logError(err){
    return this.conn.executeSql("INSERT INTO error_log(error) VALUES(?)",[err])
      .then(_ => {
        return true;
      })
      .catch(err => {
        console.log("error saving error log. " + err.message);
        return false;
      });
  }

  finishOrder(data){
      let customerId: any = null;
      let orderId: any = null;

      //get last insert id for customer_info
      return this.conn.executeSql("SELECT customer_id FROM customer_info ORDER BY customer_id DESC LIMIT 1", {})
      .then(res => {
          if(res.rows.length > 0){
            customerId = res.rows.item(0).customer_id + 1;
          }
          else{
            customerId = 1;
          }
          
          //insert customer info
          this.conn.executeSql("INSERT INTO customer_info (customer_id,order_id,contact_name,company_name,company_phone,customer_email,customer_shipping,customer_billing,source,modified) VALUES(?,?,?,?,?,?,?,?,?,?)",[
            customerId,
            0,
            data.customer[0],
            data.customer[1],
            data.customer[2],
            data.customer[3],
            data.customer[4],
            data.customer[5],
            data.source,
            1
          ]).then(_ => {
            console.log("Customer info saved." + customerId);

            //get last insert id for orders
            this.conn.executeSql("SELECT order_id FROM orders ORDER BY order_id DESC LIMIT 1", {})
            .then(res => {
                if(res.rows.length > 0){
                  orderId = res.rows.item(0).order_id + 1;
                }
                else{
                  orderId = 1;
                }

                //insert order
                var date = new Date();
                var y = date.getFullYear();
                var m = date.getMonth() + 1;
                var d = date.getDate();
                var h = date.getHours();
                var mi = date.getMinutes();
                var s = date.getSeconds();
                var currDTime = y + '-' + m + '-' + d + ' ' + h + ':' + mi + ':' + s;

                this.conn.executeSql("INSERT INTO orders (order_id,date_created,customer_id,total_discount,total_qty,order_total,order_notes,default_discount,source,modified) VALUES(?,?,?,?,?,?,?,?,?,?)",[
                  orderId,currDTime,customerId,data.tot_discount,data.tot_qty,data.order_total,data.customer[6],data.default_disc,data.source,1
                ]).then(_ => {
                    console.log("Order saved. " + orderId);

                    //update customer info
                    this.conn.executeSql("UPDATE customer_info SET order_id = ? WHERE customer_id = ?",[orderId,customerId])
                    .then(_ => {
                      console.log("customer_info updated order_id: "+ orderId);
                    })
                    .catch(err => {
                      alert("Error updating customer order id: " + err.message);
                      this.logError(err.message);
                      return false;
                    });

                    //save order items
                    let insertQuery = "INSERT INTO order_details(position,order_id,sku,price,qty,discount_rate,discounted_amt,source,modified) VALUES (?,?,?,?,?,?,?,?,?)";
                    let i: number;
                    let queries = [];
                    var index = 0;
                    for (i=0;i<=data.index-1; i++){
                      queries[index] = [
                        insertQuery,[
                          (i+1),
                          orderId,
                          data.product[i]['sku'],
                          data.product[i]['price'],
                          data.product[i]['qty'],
                          data.product[i]['disc_rate'],
                          data.product[i]['discounted'],
                          data.source,
                          1
                        ]
                      ];
                      //update product stock on hand
                      queries[index + 1] = [
                        "UPDATE product_upc_codes SET qty_available = (qty_available - ?) WHERE sku = ?",[
                          data.product[i]['qty'], data.product[i]['sku']
                        ]
                      ];
                      index += 2;
                    }
                    this.conn.sqlBatch(queries)
                    .then(_ => {
                      console.log("order product details inserted.");
                      return true;
                    })
                    .catch(err => {
                      console.log("Error insert order product details: " + err.message);
                      this.logError(err.message);
                      return false;
                    });
                })
                .catch(err => {
                  alert("Error saving order: " + err.message);
                  this.logError(err.message);
                  return false;
                });
            })
            .catch(err => {
                console.log("Error reading orders table: " + err.message);
                this.logError(err.message);
                return false;
            });

          }).catch(err => {
            alert("Error saving customer info: " + err.message);
            this.logError(err.message);
            return false;
          });
      })
      .catch(err => {
        console.log("Error reading customer_info table: " + err.message);
        this.logError(err.message);
        return false;
      });
  }

  getAllCustomers(){
    return this.conn.executeSql(`SELECT * FROM customer_info WHERE modified = 1`, {})
    .then(res => {
      return res;
    })
    .catch(err => {
      console.log("Error getting customers. " + err.message);
      this.logError(err.message);
      return false;
    });
  }

  getAllOrders(){
    return this.conn.executeSql(`SELECT * FROM orders WHERE modified = 1`, {})
    .then(res => {
      return res;
    })
    .catch(err => {
      console.log("Error getting orders. " + err.message);
      this.logError(err.message);
      return false;
    });
  }

  /*
  * get all order details
  */
  getAllOrderDetails(){
    return this.conn.executeSql(`SELECT * FROM order_details WHERE modified = 1`, {})
    .then(res => {
      return res;
    })
    .catch(err => {
      console.log("Error getting orders. " + err.message);
      this.logError(err.message);
      return false;
    });
  }

  /*
  * update source
  */
  async updateSource(source){
    await this.conn.executeSql(`UPDATE customer_info SET source=? WHERE source = ?`, [source,'']);
    await this.conn.executeSql(`UPDATE orders SET source=? WHERE source = ?`, [source,'']);
    await this.conn.executeSql(`UPDATE order_details SET source=? WHERE source = ?`, [source,'']);
    return true;
  }

  /*
  * sync customers
  */
  async syncData(data) {
    /*
    * check if data already pulled to local data
    * if yes, update local data
    * if no, insert new data
    */
    let search = await this.conn.executeSql("SELECT customer_id FROM customer_info WHERE r_order_id=? AND source=?",
      [data.order_id, data.source]
    );
    if(search.rows.length == 0){
        //get last insert id for customer_info
        let res = await this.conn.executeSql("SELECT customer_id, order_id FROM customer_info ORDER BY customer_id DESC LIMIT 1", {});
        if(res.rows.length > 0){
          if(this.email != data.customer_email) {
            this.cusId = res.rows.item(0).customer_id + 1;
            this.orId = res.rows.item(0).order_id + 1;
          }
        }
        else{
          if(this.cusId == 0) {
            this.cusId = 1;
            this.orId = 1;
          } else if(this.email != data.customer_email) {
            this.cusId++;
            this.orId++;
          }
        }
          
        if(this.email != data.customer_email) {
          //insert customer info
          await this.conn.executeSql("INSERT OR IGNORE INTO customer_info (customer_id,r_order_id,order_id,contact_name,company_name,company_phone,customer_email,customer_shipping,customer_billing,source) VALUES(?,?,?,?,?,?,?,?,?,?)",[
          this.cusId,data.order_id,this.orId,data.contact_name,data.company_name,data.company_phone,data.customer_email,data.customer_shipping,data.customer_billing,data.source]);
          //insert order
          var date = new Date();
          var y = date.getFullYear();
          var m = date.getMonth() + 1;
          var d = date.getDate();
          var h = date.getHours();
          var mi = date.getMinutes();
          var s = date.getSeconds();
          var currDTime = y + '-' + m + '-' + d + ' ' + h + ':' + mi + ':' + s;

          await this.conn.executeSql("INSERT OR IGNORE INTO orders (order_id,r_order_id,date_created,customer_id,total_discount,total_qty,order_total,order_notes,default_discount,source) VALUES(?,?,?,?,?,?,?,?,?,?)",[
          this.orId,data.order_id,currDTime,this.cusId,data.total_discount,data.total_qty,data.order_total,data.order_notes,data.default_discount,data.source]);
        }

        //save order items
        await this.conn.executeSql("INSERT INTO order_details(r_order_id,position,order_id,sku,price,qty,discounted_amt,source) VALUES (?,?,?,?,?,?,?,?)",[
        data.order_id,data.position,this.orId,data.sku,data.price,data.qty,data.disounted_amt,data.source]);
        
        this.email = data.customer_email;

        return true;
    } else {
        /*start update*/
    }
  }
}
