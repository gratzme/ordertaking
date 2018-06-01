import { Injectable } from '@angular/core';
import { Http, RequestOptions } from '@angular/http';
import 'rxjs/add/operator/map';

const API_URL = 'http://salesone.org/m_app/api/';
/*
  Generated class for the ProductService provider.

  See https://angular.io/docs/ts/latest/guide/dependency-injection.html
  for more info on providers and Angular 2 DI.
*/
@Injectable()
export class ProductService {
  public data: any;
  public response: any;
  public orders: any;
  public orderDetails: any;

  constructor(public http: Http) {
    console.log('Hello ProductService Provider');
  }

  load(barcode) {
    return this.http.get(API_URL + "search/" + barcode)
    .map(res => res.json());
  }

  loadItem(itemcode) {
    return this.http.get(API_URL + "searchitembycode/" + itemcode)
    .map(res => res.json());
  }

  submitOrder(data){
    if (this.response) {
      return Promise.resolve(this.response);
    }

    return new Promise(resolve => {
  		let options = new RequestOptions({
  			params: data
  		});

      this.http.get(API_URL + 'save/', options)
        .map(res  => res.json())
        .subscribe(data => {
          this.response = data;
          resolve(this.response);
        });
    });
  }

  updateOrder(data){
    if (this.response) {
      return Promise.resolve(this.response);
    }

    return new Promise(resolve => {
  		let options = new RequestOptions({
  			params: data
  		});

      this.http.get(API_URL + 'update/', options)
        .map(res  => res.json())
        .subscribe(data => {
          this.response = data;
          resolve(this.response);
        });
    });
  }

  getOrders(){
    if (this.orders) {
      return Promise.resolve(this.orders);
    }

    // don't have the data yet
    return new Promise(resolve => {
      this.http.get(API_URL + 'getorders/')
        .map(res => res.json())
        .subscribe(data => {
          this.orders = data;
          resolve(this.orders);
        });
    });
  }
  getOrderDetails(order_id){
    if (this.orderDetails) {
      return Promise.resolve(this.orderDetails);
    }

    // don't have the data yet
    return new Promise(resolve => {
      this.http.get(API_URL + 'getorderdetails/' + order_id)
        .map(res => res.json())
        .subscribe(data => {
          this.orderDetails = data;
          resolve(this.orderDetails);
        });
    });
  }

  logError(error){
    let options = new RequestOptions({
      params: {
        error: error
      }
    });

    this.http.get(API_URL + 'logerror/', options)
      .map(res  => res.json())
      .subscribe(data => {
        if(data){
          alert("Sorry for the inconvenience, we've log the error for investigation. Thank you!");
        }
      });
  }

  export(){
    return this.http.get(API_URL + "export/")
    .map(res => res.json());
  }

  getProductData(){
    return this.http.get(API_URL + "product/read.php/")
    .map(res => res.json());
  }

  sync(data){
    return new Promise(resolve => {
      let params = {
        customers: data['customers'],
        orders: data['orders'],
        details: data['details'],
        source: data['source']
      };

      this.http.post(API_URL + 'product/sync.php', params)
        .map(res  => res.json())
        .subscribe(data => {
          this.response = data;
          resolve(this.response);
        });
    });
  }
}
