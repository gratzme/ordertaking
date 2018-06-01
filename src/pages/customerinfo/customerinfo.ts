import { Component } from '@angular/core';
import { NavParams, Events } from 'ionic-angular';

//navigation page
@Component({
  selector: 'page-customerinfo',
  templateUrl: 'customerinfo.html'
})
export class CustomerInfoPage{
  private info: any = [];

  constructor(private params: NavParams, private events: Events){
    this.info = this.params.data.info;
    if(this.info.length < 1){
      this.info = ['','','','','','',''];
    }
    else{
      this.setCustomerInfo();
    }
  }

  setCName(contactName){
    this.info[0] = contactName.value;
    this.setCustomerInfo();
  }
  setCompName(compName){
    this.info[1] = compName.value;
    this.setCustomerInfo();
  }
  setPhone(phone){
    this.info[2] = phone.value;
    this.setCustomerInfo();
  }
  setEmail(email){
    this.info[3] = email.value;
    this.setCustomerInfo();
  }
  setShipping(shipping){
    this.info[4] = shipping.value;
    this.setCustomerInfo();
  }
  setBilling(billing){
      this.info[5] = billing.value;
      this.setCustomerInfo();
  }
  setNotes(notes){
    this.info[6] = notes.value;
    this.setCustomerInfo();
  }

  setCustomerInfo(){
    this.events.publish('info:inputted',this.info);
  }
}
