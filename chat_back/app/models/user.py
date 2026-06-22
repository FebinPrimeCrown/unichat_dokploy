from pydantic import BaseModel, EmailStr, Field, Json
from typing import List, Optional
from app.database.models import OrganisationType
from datetime import datetime


class UserBase(BaseModel):
    email: EmailStr = Field(..., description="Email address", unique=True)
    disabled: bool | None = None


class OrganisationBase(BaseModel):
    organization_name: str | None = None
    type: Optional[OrganisationType] = Field(None, description="Type of organisation (personal or business)")
    vat_or_gst_in: str | None = None
    street_address: str | None = None
    address_line_2: str | None = None
    postal_code: str | None = None
    city: str | None = None
    state: str | None = None
    country: str | None = None
    currency: str | None = None
    kyc_finish_timestamp: datetime | None = None
    kyc_verified_timestamp: datetime | None = None
    


class Organisation(OrganisationBase):
    id: int

    class Config:
        orm_mode = True
        from_attributes = True


class UserCreate(UserBase):
    password: str
    roles: list
    organisation_id: int | None = None
    organisation_name: str | None = None
    first_name: str
    last_name: str


class UserAdd(UserBase):
    password: str
    roles: list
    first_name: str
    last_name: str


class UserEdit(UserBase):
    roles: list
    first_name: str
    last_name: str


class UserStatusSwitch(UserBase):
    is_active: bool 


class KYCFile(BaseModel):
    id: int
    file_name: str
    file_id: str

    class Config:
        orm_mode = True
        from_attributes = True


class DomainHandle(BaseModel):
    id: int
    first_name: str | None = None
    last_name: str | None = None
    telephone_number: str | None = None
    city: str | None = None
    state: str | None = None
    country: str | None = None
    street_address: str | None = None

    class Config:
        orm_mode = True
        from_attributes = True


class User(UserBase):
    uuid: str
    organisation_id: int | None = None
    first_name: str
    last_name: str
    telephone_number: str | None = None
    password_provider: str
    is_group_admin: bool
    organisation: Organisation
    kyc_files: List[KYCFile] | None = None
    domain_handles: List[DomainHandle] | None = None  # Change logic in API
    is_first_login: bool | None = None
    is_admin: bool
    is_active: bool

    @classmethod
    def from_orm_with_org_domain_handles(cls, user):
        """ Custom method to fetch all domain handles under the organisation """
        return cls(
            **user.__dict__,
            domain_handles=[DomainHandle.from_orm(dh) for dh in user.organisation.domain_handles],
            kyc_files=[KYCFile.from_orm(kf) for kf in user.kyc_files]
        )

    class Config:
        orm_mode = True
        from_attributes = True

class UserDetails(User):
    is_group_admin: bool


class UserUpdate(BaseModel):
    first_name: str
    last_name: str
    telephone_number: str | None = None


class UserOrganisationUpdate(BaseModel):
    organisation_name: str | None = None
    vat_or_gst_in: str | None = None
    type: OrganisationType
    street_address: str
    address_line_2: str | None = None
    postal_code: str
    city: str
    state: str
    country: str


class ChangePassword(BaseModel):
    current_password: str
    new_password: str


class ForgotPasswordForm(BaseModel):
    email: EmailStr = Field(..., description="Email address", unique=True)
    new_password: str


class Fund(BaseModel):
    amount: str | int | float
    status: str | None = None
    product_list: list | None = None
    tax: str | int | float | None = None
    payment_method: str | None = None


class TransactionFund(BaseModel):
    amount: str | int | float
    billing_invoice_id: int
    transaction_category: str


class MonthlyFundSummary(BaseModel):
    year: int
    month: int
    total: float


class FundSummary(BaseModel):
    total_funds: float
    monthly_funds: List[MonthlyFundSummary]


class TransactionResponse(BaseModel):
    id: int
    description: str
    amount: float


class VirtualMachineSchema(BaseModel):
    id: int
    vm_id: int | None
    vm_name: str
    vm_hostname: str
    vm_ip_address: str | None
    ipv6_address: str | None = None
    vm_status: str

    class Config:
        orm_mode = True


class BareMetalServerSchema(BaseModel):
    id: int
    srv_hostname: str
    friendly_srvname: str
    srv_ip_address: str
    ipv6_address: str | None = None
    srv_status: str

    class Config:
        orm_mode = True


class ProductListSchema(BaseModel):
    order_id: int
    domain_name: str
    next_renewal: str
    status: str
    domain_handle_id: int | None = None


class HostingListSchema(BaseModel):
    id: int
    plan_name: str
    next_renewal: str
    domain_name: str | None = None


class ManagedDatabaseListSchema(BaseModel):
    id: int
    product_name: str
    next_renewal: str
    status: str
    database_type: str
    ip_address: str | None


class EmailListSchema(BaseModel):
    id: int
    plan_name: str
    next_renewal: str
    domain_name: str | None = None
    seats: int


class HostingDetailsSchema(BaseModel):
    id: int
    created_at: datetime
    plan_description: Optional[str] = None
    name_servers: Optional[str] = None
    controlpanel_url: Optional[str] = None
    status: str

    class Config:
        orm_mode = True
        from_attributes = True

class EmailDetailsSchema(BaseModel):
    id: int
    created_at: datetime
    plan_description: Optional[str] = None
    mx_records: Optional[str] = None
    status: str

    class Config:
        orm_mode = True
        from_attributes = True


class AssociatedProductSchema(BaseModel):
    id: int
    name: str
    provider: Optional[str] = None
    next_renewal: datetime
    price: float
    billing_cycle: Optional[str] = None
    privacy: Optional[bool] = None
    premium: Optional[bool] = None
    product_category: str


class AssociatedDNSManageRecords(BaseModel):
    id: int
    record_type: str
    name: str
    ttl: int
    record: str
    priority: int | None


class CreateAssociatedDNSManageRecordsSchema(BaseModel):
    record_type: str
    name: str
    ttl: int
    record: str
    priority: int | None


class UpdateAssociatedDNSManageRecordsSchema(BaseModel):
    id: int
    name: str
    ttl: int
    record: str
    priority: int | None


class DeleteAssociatedDNSManageRecordsSchema(BaseModel):
    id: int


class ProductDetailsSchema(BaseModel):
    id: int
    name: str
    provider: Optional[str] = None
    next_renewal: datetime
    billing_invoice_exists: bool
    price: float
    billing_cycle: Optional[str] = None
    privacy: Optional[bool] = None
    premium: Optional[bool] = None
    gateway: Optional[bool] = None
    product_category: str
    status: List[str] = []
    nameservers: List[str] = []
    created_date: datetime
    updated_date: datetime
    current_privacy_state: Optional[bool] = None
    domain_handle_id: int
    dhc_order_id: int
    upcoming_renewals_data: List[AssociatedProductSchema] = []
    dns_manage: Optional[bool] = None
    domain_manage_dns_records: List[AssociatedDNSManageRecords]


class ReinstallDetailsSchema(BaseModel):
    newpass: str


class VMPriceSchema(BaseModel):
    id: int
    product_id: int
    product_name: str
    vcpu_count: int
    base_ram_gb: int
    base_disk_gb: int
    max_ram_gb: int
    applicable_os: str
    register_inr: int
    renew_inr: int
    register_usd: int
    renew_usd: int
    promo_inr: int | None = None
    promo_usd: int | None = None
    upfront_annual_discount: float
    upfront_triannual_discount: float
    min_period: int
    max_period: int
    location_city: str
    location_country: str
    location_continent: str
    delivery_time: str


class CreateDomainHandleFormData(BaseModel):
    first_name: str
    last_name: str
    street_address: str
    telephone_number: str
    postal_code: str
    city: str
    state: str
    country: str
    organisation_name: str | None = None


class ClientStatusTransferSchema(BaseModel):
    status: List[str]


class DomainNameServerUpdateSchema(BaseModel):
    nameservers: List[str]


class DomainPrivacyUpdateSchema(BaseModel):
    privacy: bool