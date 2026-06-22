from sqlalchemy import Boolean, Column, Integer, String, ForeignKey, DateTime, UniqueConstraint, Enum, Text, DECIMAL, func, Numeric, or_, text, JSON, BigInteger, Date, CheckConstraint
from sqlalchemy.orm import relationship, foreign
from .base import Base
import uuid
from datetime import datetime, timezone
import random
import enum
from sqlalchemy.dialects.mysql import JSON, MEDIUMTEXT


class OrganisationType(enum.Enum):
    personal = "personal"
    business = "business"


class CurrencyType(enum.Enum):
    INR = "INR"
    USD = "USD"
    EUR = "EUR"


class TransactionType(enum.Enum):
    credit = "credit"
    debit = "debit"


class TransactionStatusType(enum.Enum):
    success = "success"
    failed = "failed"
    pending = "pending"


class ClusterStatusType(enum.Enum):
    active = "active"
    inactive = "inactive"


class VirtualMachineStatusType(enum.Enum):
    creating = "creating"
    starting = "starting"
    running = "running"
    stopping = "stopping"
    stopped = "stopped"
    reinstalling = "reinstalling"


class ManagedDatabaseStatusType(enum.Enum):
    creating = "creating"
    starting = "starting"
    running = "running"
    stopping = "stopping"
    stopped = "stopped"
    reinstalling = "reinstalling"


class BareMetalServerStatusType(enum.Enum):
    creating = "creating"
    starting = "starting"
    running = "running"
    stopping = "stopping"
    stopped = "stopped"
    reinstalling = "reinstalling"


class ActionType(enum.Enum):
    listvm = "listvm"
    createvm = "createvm"
    startvm = "startvm"
    stopvm = "stopvm"
    restartvm = "restartvm"
    poweroffvm = "poweroffvm"
    reinstallvm = "reinstallvm"


class VerificationCodeType(enum.Enum):
    forgot_password = "forgot_password"
    multi_factor = "multi_factor"


class ActionStatusType(enum.Enum):
    pending = "pending"
    completed = "completed"
    locked = "locked"


class TransactionCategoryType(enum.Enum):
    domain_renewal = "domain_renewal"
    user_add_fund = "user_add_fund"
    order_renewal = "order_renewal"
    vm_order = "vm_order"
    domain_order = "domain_order"
    hosting_order = "hosting_order"
    domain_transfer = "domain_transfer"
    rds_transfer = "rds_transfer"


# Define the enum for category
class ProductCategory(enum.Enum):
    domain = "domain"
    vm = "vm"
    rds = "rds"
    hosting = "hosting"
    license = "license"
    email = "email"
    bare_metal_server = "bare_metal_server"
    web_builder = "web_builder"


class ApplicableOS(enum.Enum):
    Linux = "Linux"
    Windows_Server = "Windows Server"
    All = "All"

class DatabaseCategory(enum.Enum):
    PostgreSQL = "PostgreSQL"
    MySQL = "MySQL"

# Define the enum for addon types
class AddonType(enum.Enum):
    RAM = "RAM"
    Disk = "Disk"


# Define the enum for billing periods
class BillingPeriod(enum.Enum):
    monthly = "monthly"
    annual = "annual"
    one_time = "one-time"
    triannual = "triannual"
    same_as_main = "same-as-main"


class ConfigurationType(enum.Enum):
    fixed = "fixed"
    customizable = "customizable"


class StorageType(enum.Enum):
    SSD = "SSD"
    HDD = "HDD"
    NVMe = "NVMe"
    SSD_HDD = "SSD + HDD"


class OrderStatusType(enum.Enum):
    Active = "Active"
    Suspended = "Suspended"
    Terminated = "Terminated"
    Creating = "Creating"
    Transferring = "Transferring"
    TransferFailed = "TransferFailed"
    Expired = "Expired"


class OrderBillingCyclePeriod(enum.Enum):
    Yearly = "Yearly"
    Monthly = "Monthly"
    Quarterly = "Quarterly"
    Semi_Annually = "Semi_Annually"
    Bi_Annually = "Bi_Annually"
    Tri_Annually = "Tri_Annually"


class DNSRecordType(enum.Enum):
    A_Record = "A_Record"
    MX_Record = "MX_Record"
    CNAME_Record = "CNAME_Record"
    TXT_Record = "TXT_Record"


class Organisation(Base):
    __tablename__ = "organisations"

    id = Column(Integer, primary_key=True, index=True)
    type = Column(Enum(OrganisationType))
    organization_name = Column(String(80), index=True)
    vat_or_gst_in = Column(String(255))
    street_address = Column(String(255))
    address_line_2 = Column(String(255))
    postal_code = Column(String(80))
    city = Column(String(255))
    state = Column(String(255))
    country = Column(String(255))
    currency = Column(Enum(CurrencyType))
    kyc_finish_timestamp = Column(DateTime, nullable=True)
    kyc_verified_timestamp = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    users = relationship("User", back_populates="organisation")
    actions = relationship("Action", back_populates="organisation")
    orders = relationship("Order", back_populates="organisation")
    billing_invoices = relationship("BillingInvoice", back_populates="organisation")
    login_details = relationship("LoginDetail", back_populates="organisation")
    domain_handles = relationship("DomainHandle", back_populates="organisation")
    widgets = relationship("Widget", back_populates="organisation")


class User(Base):
    __tablename__ = "users"

    uuid = Column(String(40), primary_key=True, default=lambda: str(uuid.uuid4()) + "-" + str(random.randint(100, 999)), unique=True, nullable=False)
    first_name = Column(String(80), index=True, nullable=False)
    last_name = Column(String(80), index=True, nullable=False)
    email = Column(String(80), unique=True, index=True, nullable=False)
    full_name = Column(String(170))
    telephone_number = Column(String(25), unique=True)
    hashed_password = Column(String(150), nullable=False)
    disabled = Column(Boolean, default=False)
    mfa_secret = Column(String(120), nullable=True)
    oauth_uid = Column(String(150), nullable=True)
    mfa_enabled = Column(Boolean, default=False)
    password_provider = Column(String(80), default="Primecrown")
    is_group_admin = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    is_admin = Column(Boolean, default=False)
    email_verified = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user_roles = relationship("UserRole", back_populates="user", overlaps="roles")
    roles = relationship("Role", secondary="user_roles", back_populates="users", overlaps="user_roles")

    organisation_id = Column(Integer, ForeignKey('organisations.id'))
    organisation = relationship("Organisation", back_populates="users")
    kyc_files = relationship("KYCFile", back_populates="user")
    actions = relationship("Action", back_populates="user")
    login_details = relationship("LoginDetail", back_populates="user")
    domain_handles = relationship("DomainHandle", back_populates="user")
    widgets_created = relationship("Widget", back_populates="creator")


class Role(Base):
    __tablename__ = "roles"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), unique=True, index=True)
    description = Column(String(255))

    user_roles = relationship("UserRole", back_populates="role", overlaps="users")
    users = relationship("User", secondary="user_roles", back_populates="roles", overlaps="user_roles")
    permissions = relationship("Permission", back_populates="role")


class UserRole(Base):
    __tablename__ = "user_roles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(40), ForeignKey('users.uuid'))
    role_id = Column(Integer, ForeignKey('roles.id'))

    # Relationships
    user = relationship("User", back_populates="user_roles", overlaps="users,roles")
    role = relationship("Role", back_populates="user_roles", overlaps="roles,users")


class Service(Base):
    __tablename__ = "services"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(80), unique=True, nullable=False)
    description = Column(String(255), nullable=True)

    permissions = relationship("Permission", back_populates="service")


class Permission(Base):
    __tablename__ = "permissions"

    id = Column(Integer, primary_key=True, index=True)
    role_id = Column(Integer, ForeignKey('roles.id'), nullable=False)
    service_id = Column(Integer, ForeignKey('services.id'), nullable=False)
    read = Column(Boolean, default=False)
    write = Column(Boolean, default=False)
    edit = Column(Boolean, default=False)
    delete = Column(Boolean, default=False)

    # Define a composite unique constraint
    __table_args__ = (
        UniqueConstraint('role_id', 'service_id', name='uq_role_service'),
    )

    role = relationship("Role", back_populates="permissions")
    service = relationship("Service", back_populates="permissions")


class RefreshToken(Base):
    __tablename__ = "refresh_tokens"

    id = Column(Integer, primary_key=True, index=True)
    token = Column(String(1050), nullable=False)
    user_uuid = Column(String(40), ForeignKey('users.uuid'), nullable=False)
    user = relationship("User")
    issued_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    expires_at = Column(DateTime, nullable=False)
    revoked = Column(Boolean, default=False)
    device_fingerprint = Column(String(255), nullable=False)
    client_ip = Column(String(45), nullable=False) 


class AccessToken(Base):
    __tablename__ = "access_tokens"

    id = Column(Integer, primary_key=True, index=True)
    token = Column(String(1050), nullable=False)
    user_uuid = Column(String(40), ForeignKey('users.uuid'), nullable=False)
    user = relationship("User")
    issued_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    expires_at = Column(DateTime, nullable=False)
    revoked = Column(Boolean, default=False)
    device_fingerprint = Column(String(255), nullable=False)
    client_ip = Column(String(45), nullable=False)



class LoginDetail(Base):
    __tablename__ = "login_details"

    id = Column(Integer, primary_key=True, index=True)
    organisation_id = Column(Integer, ForeignKey('organisations.id'), nullable=False)
    user_id = Column(String(40), ForeignKey('users.uuid'), nullable=False)
    client_ip = Column(String(45), nullable=False)
    device_fingerprint = Column(String(255), nullable=False)
    verified_device = Column(Boolean, default=False)
    login_time_stamp = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    organisation = relationship("Organisation", back_populates="login_details")
    user = relationship("User", back_populates="login_details")


class UserVerificationCode(Base):
    __tablename__ = "user_verification_codes"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(40), ForeignKey('users.uuid'), nullable=False)
    verification_code = Column(String(6), nullable=False)
    type = Column(Enum(VerificationCodeType), nullable=False)
    auth_token = Column(String(255), nullable=False)
    attempt_counter = Column(Integer(), nullable=False)
    resend_counter = Column(Integer(), nullable=False)
    expires_at = Column(DateTime, nullable=False)


class KYCFile(Base):
    __tablename__ = "kyc_files"

    id = Column(Integer, primary_key=True, index=True)
    file_name = Column(String(255), nullable=False)
    file_id = Column(String(255), nullable=False)
    file_type = Column(String(50), nullable=False)
    file_size = Column(Integer, nullable=False)
    uploaded_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    user_uuid = Column(String(40), ForeignKey('users.uuid'), nullable=False)

    user = relationship("User", back_populates="kyc_files")


class Cluster(Base):
    __tablename__ = "clusters"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    hostname = Column(String(255), nullable=False)
    description = Column(Text)
    server_url = Column(String(255), nullable=False)
    api_key = Column(String(255), nullable=False)
    api_pass = Column(String(255), nullable=False) # this is salt encrypted value only.
    location = Column(String(255), nullable=False)
    status = Column(Enum(ClusterStatusType))
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), server_default=func.now())

    vm_order_details = relationship("VMOrderDetail", back_populates="cluster")
    actions = relationship("Action", back_populates="cluster")


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    organisation_id = Column(Integer, ForeignKey('organisations.id'))
    billing_invoice_id = Column(Integer, ForeignKey('billing_invoices.id'), nullable=True)
    description = Column(Text)
    currency = Column(Enum(CurrencyType))
    amount = Column(DECIMAL(10, 2))
    transaction_type = Column(Enum(TransactionType))
    transaction_date = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    locked = Column(Boolean, default=False)
    status = Column(Enum(TransactionStatusType))
    razorpay_order_id = Column(String(255))
    razorpay_payment_id = Column(String(255))
    category = Column((Enum(TransactionCategoryType)), nullable=False)

    billing_invoice = relationship("BillingInvoice", back_populates="transactions")


class WebhookOutput(Base):
    __tablename__ = "webhookoutputs"

    id = Column(Integer, primary_key=True, index=True)
    razorpay_account_id = Column(String(255))
    order_id = Column(String(255))
    payment_id = Column(String(255))
    status = Column(String(255))
    event = Column(String(255))
    signature_verified = Column(Boolean)
    amount = Column(Numeric)
    currency = Column(String(10))
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    entity_id = Column(String(255))
    error_code = Column(String(255), nullable=True)
    error_description = Column(String(1024), nullable=True)
    event_timestamp = Column(DateTime, nullable=True)


class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    product_name = Column(String(50), nullable=False)  # General name like VM, Domain, etc.
    category = Column(Enum(ProductCategory), nullable=False)  # Enum for product categories
    product_details = Column(Text)  # General description or details about the product
    provider = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    vm_prices = relationship("VMPrice", back_populates="product")
    dedicated_server_prices = relationship("DedicatedServerPrice", back_populates="product")
    dedicated_server_addons = relationship("DedicatedServerAddon", back_populates="product")
    vm_addons = relationship("VMAddon", back_populates="product")
    managed_database_prices = relationship("ManagedDataBasePrice", back_populates="product")
    subscription_prices = relationship("SubscriptionPrice", back_populates="product")
    hosting_prices = relationship("HostingPrice", back_populates="product")
    domain_prices = relationship("DomainPrice", back_populates="product")
    orders = relationship("Order", back_populates="product")


class VMPrice(Base):
    __tablename__ = "vm_prices"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    product_id = Column(Integer, ForeignKey('products.id'), nullable=False)  # Reference to products table
    product_name = Column(String(50), nullable=False)  # Product name for VM
    vcpu_count = Column(Integer, nullable=False)  # Fixed vCPU count
    base_ram_gb = Column(Integer, nullable=False)  # Amount of RAM in GB
    base_disk_gb = Column(Integer, nullable=False)  # Disk size (NVMe type)
    max_ram_gb = Column(Integer, nullable=False)  # Maximum allowed RAM in GB
    plid = Column(Integer)
    applicable_os = Column(Enum(ApplicableOS), nullable=False)  # Enum for applicable OS
    register_inr = Column(DECIMAL(10, 2), nullable=False)  # Registration price in INR
    renew_inr = Column(DECIMAL(10, 2), nullable=False)  # Renewal price in INR
    register_usd = Column(DECIMAL(10, 2), nullable=False)  # Registration price in USD
    renew_usd = Column(DECIMAL(10, 2), nullable=False)  # Renewal price in USD
    promo_inr = Column(DECIMAL(10, 2))  # Promotional price in INR (optional)
    promo_usd = Column(DECIMAL(10, 2))  # Promotional price in USD (optional)
    upfront_annual_discount_inr = Column(DECIMAL(10, 2), nullable=False)  # Annual upfront discount percentage inr
    upfront_annual_discount_usd = Column(DECIMAL(10, 2), nullable=False)  # Annual upfront discount percentage usd
    upfront_biannual_discount_inr = Column(DECIMAL(10, 2), nullable=False)  # Triannual upfront discount percentage inr
    upfront_biannual_discount_usd = Column(DECIMAL(10, 2), nullable=False)  # Triannual upfront discount percentage usd
    upfront_annual_renew_inr = Column(DECIMAL(10, 2), nullable=False)
    upfront_annual_renew_usd = Column(DECIMAL(10, 2), nullable=False)
    upfront_biannual_renew_inr = Column(DECIMAL(10, 2), nullable=False)
    upfront_biannual_renew_usd = Column(DECIMAL(10, 2), nullable=False)
    min_period = Column(Integer, nullable=False)  # Minimum billing period
    max_period = Column(Integer, nullable=False)  # Maximum billing period
    location_city = Column(String(100), nullable=False)  # Location of the server
    location_country = Column(String(100), nullable=False)
    location_continent = Column(String(100), nullable=False)
    delivery_time = Column(String(50), nullable=False)  # Estimated delivery time

    product = relationship("Product", back_populates="vm_prices")


class VMAddon(Base):
    __tablename__ = "vm_addons"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    product_id = Column(Integer, ForeignKey('products.id'), nullable=False)  # Reference to the products table
    addon_type = Column(Enum(AddonType), nullable=False)  # Enum: RAM, Disk
    addon_name = Column(String(100), nullable=False)  # Specific name for the add-on
    addon_unit_size = Column(Integer)  # Size of the add-on, optional
    price_inr = Column(DECIMAL(10, 2), nullable=False)  # Price of the add-on in INR
    price_usd = Column(DECIMAL(10, 2), nullable=False)  # Price of the add-on in USD
    billing_period = Column(Enum(BillingPeriod), nullable=False)  # Enum for billing period
    is_optional = Column(Boolean, nullable=False, default=True)  # Whether the add-on is optional
    alpha_3_code = Column(String(3), nullable=False)

    product = relationship("Product", back_populates="vm_addons")


class DedicatedServerPrice(Base):
    __tablename__ = "dedicated_server_prices"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    
    # Foreign key to products table
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    product_name = Column(String(100), nullable=False)  # Name of the product
    
    # Enum fields for configuration and storage types
    configuration_type = Column(Enum(ConfigurationType), nullable=False)
    storage_type = Column(Enum(StorageType), nullable=False)
    
    base_ram_gb = Column(Integer, nullable=False)  # Base RAM spec
    base_storage_gb = Column(Integer, nullable=False)  # Base storage size
    nvme_slots = Column(Integer, nullable=True)  # NVMe slots for customizable configs
    ssd_hdd_slots = Column(Integer, nullable=True)  # SSD/HDD slots for customizable configs
    
    # Applicable OS enum
    applicable_os = Column(Enum(ApplicableOS), nullable=False)
    
    # Pricing fields
    register_inr = Column(Integer, nullable=False)
    renew_inr = Column(Integer, nullable=False)
    os_cost_inr = Column(Integer, nullable=True)  # Applicable for Windows
    
    register_usd = Column(Integer, nullable=False)
    renew_usd = Column(Integer, nullable=False)
    
    promo_inr = Column(Integer, nullable=True)  # Optional promotional prices
    promo_usd = Column(Integer, nullable=True)
    
    # Discount fields
    upfront_annual_discount = Column(DECIMAL(5, 2), nullable=True)
    upfront_triannual_discount = Column(DECIMAL(5, 2), nullable=True)
    
    # Billing periods
    min_period = Column(Integer, nullable=False)
    max_period = Column(Integer, nullable=False)
    
    # Additional fields
    location = Column(String(100), nullable=False)
    delivery_time = Column(String(50), nullable=False)

    # Relationship to the products table (optional, if needed for ORM purposes)
    product = relationship("Product", back_populates="dedicated_server_prices")


class DedicatedServerAddon(Base):
    __tablename__ = "dedicated_server_addons"

    id = Column(Integer, primary_key=True, autoincrement=True)
    product_id = Column(Integer, ForeignKey('products.id'), nullable=False)  # Reference to the products table

    addon_type = Column(Enum('RAM', 'Storage'), nullable=False)

    # RAM Add-ons
    addon_ram_gb = Column(Integer, nullable=True)  # Nullable for storage add-ons
    ram_price_inr = Column(Integer, nullable=True)  # Price for RAM in INR
    ram_price_usd = Column(Integer, nullable=True)  # Price for RAM in USD

    # Storage Add-ons
    storage_type = Column(Enum('SSD', 'HDD', 'NVMe'), nullable=True)  # Nullable for RAM add-ons
    addon_storage_gb = Column(Integer, nullable=True)  # Nullable for RAM add-ons
    storage_price_inr = Column(Integer, nullable=True)  # Price for storage in INR
    storage_price_usd = Column(Integer, nullable=True)  # Price for storage in USD
    alpha_3_code = Column(String(3), nullable=False)

    # Relationships
    product = relationship("Product", back_populates="dedicated_server_addons")


class ServerCommonAddon(Base):
    __tablename__ = "server_common_addons"

    id = Column(Integer, primary_key=True, autoincrement=True)
    addon_type = Column(Enum('License', 'Support', 'OS'), nullable=False)
    addon_name = Column(String(100), nullable=False)
    price_inr = Column(DECIMAL(10, 2), nullable=False)
    price_usd = Column(DECIMAL(10, 2), nullable=False)
    account = Column(Integer, nullable=False)  # can be 1, 5, 30, 100, 250 or unlimited (0)
    billing_period = Column(Enum(BillingPeriod), nullable=False)
    applicable_to = Column(Enum('VM', 'Dedicated Server', 'All'), nullable=False)
    applicable_os = Column(Enum(ApplicableOS), nullable=False)
    is_optional = Column(Boolean, nullable=False)
    version_name = Column(String(255), nullable=True)
    is_inclusive = Column(Boolean, default=False) # applicable for windows vm plans
    os_id = Column(Integer)


class SubscriptionPrice(Base):
    __tablename__ = "subscription_prices"

    id = Column(Integer, primary_key=True, autoincrement=True)
    product_id = Column(Integer, ForeignKey('products.id'), nullable=False)
    plan_name = Column(String(50), nullable=False)
    max_accounts = Column(Integer, nullable=False)
    register_inr = Column(Integer, nullable=False)
    renew_inr = Column(Integer, nullable=False)
    register_usd = Column(Integer, nullable=False)
    renew_usd = Column(Integer, nullable=False)
    promo_inr = Column(Integer, nullable=True)
    min_period = Column(Integer, nullable=False)
    max_period = Column(Integer, nullable=False)

    product = relationship("Product", back_populates="subscription_prices")


class HostingPrice(Base):
    __tablename__ = "hosting_prices"

    id = Column(Integer, primary_key=True, autoincrement=True)
    product_id = Column(Integer, ForeignKey('products.id'), nullable=False)
    plan_name = Column(String(100), nullable=False)
    storage_gb = Column(Integer, nullable=False)
    bandwidth_gb = Column(Integer, nullable=False)
    account_limit = Column(Integer, nullable=False)
    applicable_os = Column(Enum(ApplicableOS), nullable=False)
    annual_register_inr = Column(DECIMAL(10, 2), nullable=False)
    annual_renew_inr = Column(DECIMAL(10, 2), nullable=False)
    annual_register_usd = Column(DECIMAL(10, 2), nullable=False)
    annual_renew_usd = Column(DECIMAL(10, 2), nullable=False)
    promo_inr = Column(Integer, nullable=True)
    promo_usd = Column(Integer, nullable=True)
    upfront_biannual_discount_inr = Column(DECIMAL(10, 2), nullable=True)
    upfront_biannual_discount_usd = Column(DECIMAL(10, 2), nullable=True)
    upfront_triannual_discount_inr = Column(DECIMAL(10, 2), nullable=True)
    upfront_triannual_discount_usd = Column(DECIMAL(10, 2), nullable=True)
    upfront_biannual_renew_inr = Column(DECIMAL(10, 2), nullable=True)
    upfront_biannual_renew_usd = Column(DECIMAL(10, 2), nullable=True)
    upfront_triannual_renew_inr = Column(DECIMAL(10, 2), nullable=True)
    upfront_triannual_renew_usd = Column(DECIMAL(10, 2), nullable=True)
    location = Column(String(100), nullable=True)
    min_period = Column(Integer, nullable=False)
    max_period = Column(Integer, nullable=False)
    features = Column(JSON)

    product = relationship("Product", back_populates="hosting_prices")


class DomainPrice(Base):
    __tablename__ = "domain_prices"

    id = Column(Integer, primary_key=True, autoincrement=True)
    product_id = Column(Integer, ForeignKey('products.id'), nullable=False)
    tld = Column(String(25), nullable=False)
    register_inr = Column(DECIMAL(10, 2), nullable=True)
    renew_inr = Column(DECIMAL(10, 2), nullable=True)
    transfer_inr = Column(DECIMAL(10, 2), nullable=True)
    restore_inr = Column(DECIMAL(10, 2), nullable=True)
    register_usd = Column(DECIMAL(10, 2), nullable=True)
    renew_usd = Column(DECIMAL(10, 2), nullable=True)
    transfer_usd = Column(DECIMAL(10, 2), nullable=True)
    restore_usd = Column(DECIMAL(10, 2), nullable=True)
    min_period = Column(Integer, nullable=True)
    max_period = Column(Integer, nullable=True)
    promo_inr = Column(DECIMAL(10, 2), nullable=True)
    promo_usd = Column(DECIMAL(10, 2), nullable=True)
    special_first_year_price_usd = Column(DECIMAL(10, 2))
    special_first_year_price_inr = Column(DECIMAL(10, 2))
    minimum_year_for_promo_price = Column(Integer)
    privacy_eligible = Column(Boolean, default=False)

    product = relationship("Product", back_populates="domain_prices")


class ManagedDataBasePrice(Base):
    __tablename__ = "managed_database_prices"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    product_id = Column(Integer, ForeignKey('products.id'), nullable=False)  # Reference to products table
    product_name = Column(String(50), nullable=False)  # Product name for VM
    vcpu_count = Column(Integer, nullable=False)  # Fixed vCPU count
    base_ram_gb = Column(Integer, nullable=False)  # Amount of RAM in GB
    base_disk_gb = Column(Integer, nullable=False)  # Disk size (NVMe type)
    applicable_os = Column(Enum(ApplicableOS), nullable=True)  # Enum for applicable OS
    database_type = Column(Enum(DatabaseCategory), nullable=False)  # Enum for database category
    register_inr = Column(DECIMAL(10, 2), nullable=False)  # Registration price in INR
    renew_inr = Column(DECIMAL(10, 2), nullable=False)  # Renewal price in INR
    register_usd = Column(DECIMAL(10, 2), nullable=False)  # Registration price in USD
    renew_usd = Column(DECIMAL(10, 2), nullable=False)  # Renewal price in USD
    promo_inr = Column(DECIMAL(10, 2))  # Promotional price in INR (optional)
    promo_usd = Column(DECIMAL(10, 2))  # Promotional price in USD (optional)
    upfront_annual_discount_inr = Column(DECIMAL(10, 2), nullable=False)  # Annual upfront discount percentage inr
    upfront_annual_discount_usd = Column(DECIMAL(10, 2), nullable=False)  # Annual upfront discount percentage usd
    upfront_annual_renew_inr = Column(DECIMAL(10, 2), nullable=False)
    upfront_annual_renew_usd = Column(DECIMAL(10, 2), nullable=False)
    min_period = Column(Integer, nullable=False)  # Minimum billing period
    max_period = Column(Integer, nullable=False)  # Maximum billing period
    location_city = Column(String(100), nullable=False)  # Location of the server
    location_country = Column(String(100), nullable=False)
    location_continent = Column(String(100), nullable=False)
    delivery_time = Column(String(50), nullable=False)  # Estimated delivery time
    in_stock = Column(Boolean, default=True)

    product = relationship("Product", back_populates="managed_database_prices")


class OrderBundle(Base):
    __tablename__ = "order_bundles"

    id = Column(Integer, primary_key=True, autoincrement=True)
    order_id_1 = Column(Integer, ForeignKey('orders.order_id'), nullable=False)  # First order in the relationship
    order_id_2 = Column(Integer, ForeignKey('orders.order_id'), nullable=False)  # Second order in the relationship

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationship to both orders
    order_1 = relationship("Order", foreign_keys=[order_id_1], back_populates="bundled_as_order_1")
    order_2 = relationship("Order", foreign_keys=[order_id_2], back_populates="bundled_as_order_2")


class Order(Base):
    __tablename__ = "orders"

    order_id = Column(Integer, primary_key=True, autoincrement=True)
    organisation_id = Column(Integer, ForeignKey('organisations.id'), nullable=False)
    product_id = Column(Integer, ForeignKey('products.id'), nullable=False)
    product_name = Column(String(255), nullable=False)
    first_purchase_amount = Column(DECIMAL(10, 2), nullable=False)
    total_amount = Column(DECIMAL(10, 2), nullable=False)
    currency = Column(Enum("INR", "USD", "EUR", name="currency_enum"), nullable=False)
    billing_cycle = Column(Enum(OrderBillingCyclePeriod), nullable=False)
    order_date = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    status = Column(Enum(OrderStatusType), nullable=False)
    next_renewal = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    organisation = relationship("Organisation", back_populates="orders")
    product = relationship("Product", back_populates="orders")
    vm_order_details = relationship("VMOrderDetail", back_populates="order")
    hosting_order_details = relationship("HostingOrderDetail", back_populates="order")
    email_order_details = relationship("EmailOrderDetail", back_populates="order")
    vm_addon_order_details = relationship("VMAddonOrderDetail", back_populates="order")
    domain_order_details = relationship("DomainOrderDetail", back_populates="order")
    billing_invoice_details = relationship("BillingInvoiceDetail", back_populates="order")
    managed_database_order_details = relationship("ManagedDatabaseOrderDetail", back_populates="order")
    aibuilder_order_details = relationship("AiBuilderOrderDetail", back_populates="order")

    # Relationships to the OrderBundle table, specifying foreign keys explicitly
    bundled_as_order_1 = relationship(
        "OrderBundle",
        foreign_keys=[OrderBundle.order_id_1],
        back_populates="order_1"
    )

    bundled_as_order_2 = relationship(
        "OrderBundle",
        foreign_keys=[OrderBundle.order_id_2],
        back_populates="order_2"
    )


class VMOrderDetail(Base):
    __tablename__ = "vm_order_details"

    id = Column(Integer, primary_key=True, autoincrement=True, unique=True)  # Make it standalone PK
    order_id = Column(Integer, ForeignKey('orders.order_id'))
    vm_id = Column(Integer, nullable=True) # vm_id from api
    vm_number = Column(String(10), nullable=True) # same as vm_id
    vm_name = Column(String(255), nullable=False) # friendly name from user
    vm_hostname = Column(String(255), nullable=False) #fully qualifed domain name
    vm_ip_address = Column(String(45), nullable=True)  # IP address length
    vm_cluster_id = Column(Integer, ForeignKey('clusters.id'), nullable=True)
    vcpu_count = Column(Integer, nullable=False)
    base_ram_gb = Column(Integer, nullable=False)
    base_disk_gb = Column(Integer, nullable=False)
    current_ram_gb = Column(Integer, nullable=False)
    current_disk_gb = Column(Integer, nullable=False)
    os_id = Column(Integer, nullable=True)
    vps_name = Column(String(80), nullable=True) # obtained from vm create api
    vm_status = Column(Enum(VirtualMachineStatusType), nullable=False)
    ipv6_enabled = Column(Boolean, default=False)
    ipv6_address = Column(String(255))
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    order = relationship("Order", back_populates="vm_order_details")
    cluster = relationship("Cluster", back_populates="vm_order_details")
    actions = relationship("Action", back_populates="virtualmachine")
    vm_addon_order_details = relationship("VMAddonOrderDetail", back_populates="parent_virtual_machine")
    bandwidth_usages = relationship("VMBandwidthUsage", back_populates="vm", cascade="all, delete-orphan")


class VMAddonOrderDetail(Base):
    __tablename__ = "vm_addon_order_details"

    id = Column(Integer, primary_key=True, autoincrement=True)
    addon_product_name = Column(String(100), nullable=False)
    order_id = Column(Integer, ForeignKey('orders.order_id'), primary_key=True)
    parent_virtual_machine_id = Column(Integer, ForeignKey('vm_order_details.id'), primary_key=True)

    order = relationship("Order", back_populates="vm_addon_order_details")
    parent_virtual_machine = relationship("VMOrderDetail", back_populates="vm_addon_order_details")


class ManagedDatabaseOrderDetail(Base):
    __tablename__ = "managed_database_order_details"

    id = Column(Integer, primary_key=True, autoincrement=True)
    order_id = Column(Integer, ForeignKey('orders.order_id'), primary_key=True)
    product_name = Column(String(255), nullable=False) # this field can represent the plan name
    vcpu_count = Column(Integer, nullable=False)
    base_ram_gb = Column(Integer, nullable=False)
    base_disk_gb = Column(Integer, nullable=False)
    current_ram_gb = Column(Integer, nullable=False)
    current_disk_gb = Column(Integer, nullable=False)
    status = Column(Enum(ManagedDatabaseStatusType), nullable=False)
    database_type = Column(Enum(DatabaseCategory), nullable=False)
    ip_address = Column(String(45), nullable=True)  # IP address length
    ipv6_enabled = Column(Boolean, default=False)
    ipv6_address = Column(String(255))
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    order = relationship("Order", back_populates="managed_database_order_details")


class BareMetalServerOrderDetail(Base):
    __tablename__ = "bare_metal_server_order_details"

    id = Column(Integer, primary_key=True, autoincrement=True)
    order_id = Column(Integer, ForeignKey('orders.order_id'), primary_key=True)
    srv_hostname = Column(String(255), nullable=False)
    srv_ip_address = Column(String(45), nullable=True)
    srv_cpu = Column(String(30), nullable=True)
    srv_ram_gb = Column(Integer, nullable=False)
    srv_refid = Column(String(100))
    srv_status = Column(Enum(BareMetalServerStatusType), nullable=False)
    srv_description = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    os_name = Column(String(255), nullable=False)
    friendly_srvname = Column(String(80), nullable=True)
    ipv6_enabled = Column(Boolean, default=False)
    ipv6_address = Column(String(255))
    ddos_enabled = Column(Boolean, default=False)
    ddos_pps = Column(String(30), nullable=True)
    srv_location = Column(String(3), nullable=False)


class DomainOrderDetail(Base):
    __tablename__ = "domain_order_details"

    order_id = Column(Integer, ForeignKey('orders.order_id'), primary_key=True)
    privacy = Column(Boolean, nullable=True)  # Assuming tinyint(1) is used for boolean
    premium = Column(Boolean, nullable=True)  # Assuming tinyint(1) is used for boolean
    domain_name = Column(String(255), nullable=False)
    next_renewal = Column(DateTime, nullable=True)
    provider = Column(String(50), nullable=True)
    gateway = Column(Boolean, nullable=True)
    domain_handle_id = Column(Integer, ForeignKey('domain_handles.id'))
    name_servers = Column(JSON, nullable=True)
    dhc_order_id = Column(Integer, nullable=True)
    dns_manage = Column(Boolean, default=False)

    # Add other fields here as needed

    order = relationship("Order", back_populates="domain_order_details")
    domain_handle = relationship("DomainHandle", back_populates="domain_order_details")
    domain_manage_dns_records = relationship("DomainManageDNSRecord", back_populates="domain")


class HostingOrderDetail(Base):
    __tablename__ = "hosting_order_details"

    id = Column(Integer, primary_key=True, autoincrement=True)
    order_id = Column(Integer, ForeignKey('orders.order_id'), primary_key=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    plan_name = Column(String(255), nullable=False) # this field can represent the plan name
    plan_description = Column(Text, nullable=True)
    domain_name = Column(String(255), nullable=True)
    next_renewal = Column(DateTime, nullable=False)
    name_servers = Column(JSON, nullable=True)
    controlpanel_url = Column(String(255), nullable=True)

    order = relationship("Order", back_populates="hosting_order_details")


class EmailOrderDetail(Base):
    __tablename__ = "email_order_details"

    id = Column(Integer, primary_key=True, autoincrement=True)
    order_id = Column(Integer, ForeignKey('orders.order_id'), primary_key=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    next_renewal = Column(DateTime, nullable=False)
    plan_name = Column(String(255), nullable=False) # this field can represent the plan name
    plan_description = Column(Text, nullable=True)
    domain_name = Column(String(255), nullable=True)
    mx_records = Column(JSON, nullable=True)
    seats = Column(Integer, nullable=False)

    order = relationship("Order", back_populates="email_order_details")


class BillingInvoice(Base):
    __tablename__ = "billing_invoices"

    id = Column(Integer, primary_key=True, autoincrement=True)
    invoice_ref = Column(String(25), nullable=False)
    organisation_id = Column(Integer, ForeignKey('organisations.id'), nullable=False)
    invoice_title = Column(String(255), nullable=False)
    inv_date = Column(DateTime, nullable=False)
    due_date = Column(DateTime, nullable=True)
    status = Column(String(20), nullable=False)
    total_amount = Column(DECIMAL(10, 2), nullable=False)
    currency = Column(Enum(CurrencyType), nullable=False)
    description = Column(Text, nullable=True)
    tax = Column(DECIMAL(10, 2), nullable=False)
    approved = Column(Boolean, default=False)
    approved_by = Column(String(255))
    meta_data = Column(JSON, nullable=True)
    payment_mode = Column(String(255), nullable=True)

    organisation = relationship("Organisation", back_populates="billing_invoices")
    billing_invoice_details = relationship("BillingInvoiceDetail", back_populates="billing_invoice")
    transactions = relationship("Transaction", back_populates="billing_invoice")


class BillingInvoiceDetail(Base):
    __tablename__ = "billing_invoice_details"

    id = Column(Integer, primary_key=True, autoincrement=True)
    item_title = Column(String(300), nullable=False)
    discount_percentage = Column(DECIMAL(10, 2), nullable=True)
    amount = Column(DECIMAL(10, 2), nullable=False)
    currency = Column(Enum(CurrencyType), nullable=False)
    duration = Column(Integer)
    next_renewal = Column(DateTime)
    action = Column(String(255))

    billing_invoice_id = Column(Integer, ForeignKey('billing_invoices.id'), nullable=False)
    order_id = Column(Integer, ForeignKey('orders.order_id'), nullable=False)

    billing_invoice = relationship("BillingInvoice", back_populates="billing_invoice_details")
    order = relationship("Order", back_populates="billing_invoice_details")


class Action(Base):
    __tablename__ = "actions"

    id = Column(Integer, primary_key=True, index=True)
    organisation_id = Column(Integer, ForeignKey('organisations.id'), nullable=False)
    user_id = Column(String(40), ForeignKey('users.uuid'), nullable=False)
    cluster_id = Column(Integer, ForeignKey('clusters.id'))
    vm_id = Column(Integer, ForeignKey('vm_order_details.id'))
    action_name = Column(Enum(ActionType), nullable=False)
    status = Column(Enum(ActionStatusType))
    root_pass = Column(String(256))
    plid = Column(String(256))
    vm_plan_id = Column(Integer)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), server_default=func.now())

    organisation = relationship("Organisation", back_populates="actions")
    user = relationship("User", back_populates="actions")
    cluster = relationship("Cluster", back_populates="actions")
    virtualmachine = relationship("VMOrderDetail", back_populates="actions")


class WebbuilderDetails(Base):
    __tablename__ = "webbuilder_details"

    uuid = Column(String(40), primary_key=True, default=lambda: str(uuid.uuid4()), unique=True, nullable=False)
    organisation_id = Column(Integer, ForeignKey('organisations.id'), nullable=False)
    user_id = Column(String(40), ForeignKey('users.uuid'), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False, onupdate=lambda: datetime.now(timezone.utc))
    user_prompt = Column(Text, nullable=False)  # To store the userPrompt string
    category = Column(String(255), nullable=True)  # Category field
    company_name = Column(String(255), nullable=True)  # Company name field
    company_description = Column(Text, nullable=True)
    json_data = Column(Text, nullable=True)  # Storing JSON data as text
    title = Column(String(255), nullable=False)
    launched = Column(Boolean, default=False)
    launched_at = Column(DateTime, nullable=True)
    html_content = Column(Text, nullable=True)  # Stores HTML content
    css_content = Column(Text, nullable=True)

    is_deleted = Column(Boolean, default=False)
    deleted_at = Column(DateTime, nullable=True)

class AiBuilderOrderDetail(Base):
    __tablename__ = "aibuilder_order_details"

    id = Column(Integer, primary_key=True, autoincrement=True)
    order_id = Column(Integer, ForeignKey("orders.order_id"), nullable=False)
    domain_name = Column(String(255), nullable=True)
    next_renewal = Column(DateTime, nullable=True)
    published = Column(Boolean, default=False)
    updated_at = Column(DateTime, default=datetime.utcnow)

    webbuilder_uuid = Column(String(40), ForeignKey("webbuilder_details.uuid"), nullable=True)
    webbuilder_details = relationship("WebbuilderDetails", backref="aibuilder_order_detail")

    order = relationship("Order", back_populates="aibuilder_order_details")

class Components(Base):
    __tablename__ = "components"  # This must match your table name in the database

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    component_name = Column(String(255), nullable=False)
    component_css = Column(Text, nullable=True)
    component_html = Column(Text, nullable=True)
    component_js = Column(Text, nullable=True)


class DomainHandle(Base):
    __tablename__ = "domain_handles"

    id = Column(Integer, primary_key=True, index=True)
    organisation_id = Column(Integer, ForeignKey('organisations.id'), nullable=False)
    user_id = Column(String(40), ForeignKey('users.uuid'), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    handle  = Column(String(255), nullable=False)
    first_name = Column(String(80))
    last_name = Column(String(80))
    telephone_number = Column(String(25))
    city = Column(String(255))
    state = Column(String(255))
    street_address = Column(String(255))
    country = Column(String(255))
    postal_code = Column(String(80))
    email = Column(String(80))
    organisation_name = Column(String(255))

    organisation = relationship("Organisation", back_populates="domain_handles")
    user = relationship("User", back_populates="domain_handles")
    domain_order_details = relationship("DomainOrderDetail", back_populates="domain_handle")


class VMBandwidthUsage(Base):
    __tablename__ = "vm_bandwidth_usage"

    id = Column(Integer, primary_key=True, index=True)
    vm_id = Column(Integer, ForeignKey('vm_order_details.id'), nullable=False)
    inbound_bytes = Column(BigInteger, default=0)
    outbound_bytes = Column(BigInteger, default=0)

    # Exact timestamp of when the record was created
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Normalized date (e.g., 20250501), used for filtering/grouping
    usage_date = Column(String(8), nullable=False, index=True)

    vm = relationship("VMOrderDetail", back_populates="bandwidth_usages")


class DomainManageDNSRecord(Base):
    __tablename__ = "domain_manage_dns_records"

    id = Column(Integer, primary_key=True, index=True)
    domain_order_id = Column(Integer, ForeignKey('domain_order_details.order_id'))
    record_type = Column(Enum(DNSRecordType), nullable=False)
    name = Column(String(255), nullable=False)
    ttl = Column(Integer, nullable=False)
    record = Column(String(2048))
    priority = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    deleted_at = Column(DateTime, nullable=True)

    domain = relationship("DomainOrderDetail", back_populates="domain_manage_dns_records")

    __table_args__ = (
        CheckConstraint('ttl >= 7200 AND ttl <= 86400', name='check_ttl_range'),
    )

class WidgetIndex(Base):
    __tablename__ = "widget_indexes"

    id = Column(Integer, primary_key=True, autoincrement=True)
    widget_id = Column(Integer, ForeignKey("widgets.id"), nullable=False)
    instruction_text = Column(MEDIUMTEXT, nullable=False)
    index_name = Column(String(255), nullable=False)

    widget = relationship("Widget", back_populates="indexes")


class Widget(Base):
    __tablename__ = "widgets"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), nullable=False)
    token = Column(String(256), unique=True, index=True, default=lambda: str(uuid.uuid4()))
    allowed_domains = Column(JSON, default=[])  # Use JSON for MySQL
    ai_website_id = Column(String(512), nullable=True)
    is_active = Column(Boolean, default=True)

    organisation_id = Column(Integer, ForeignKey("organisations.id"), nullable=False)
    created_by_user_id = Column(String(40), ForeignKey("users.uuid"), nullable=False)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    flow_json = Column(JSON, nullable=True)
    # Relationships
    organisation = relationship("Organisation", back_populates="widgets")
    creator = relationship("User", back_populates="widgets_created")
    chat_sessions = relationship("ChatSession", back_populates="widget")
    indexes = relationship("WidgetIndex", back_populates="widget", cascade="all, delete-orphan")


class ChatSession(Base):
    __tablename__ = "chat_sessions"

    id = Column(Integer, primary_key=True, index=True)
    guest_id = Column(String(255), nullable=False)         # ✅ add length
    room_id = Column(String(255), nullable=False)          # ✅ add length
    last_message = Column(String(1000), nullable=True)     # ✅ add length
    last_active = Column(DateTime, default=datetime.utcnow)
    current_node_id = Column(String(100), nullable=True)


    widget_id = Column(Integer, ForeignKey("widgets.id"), nullable=False)
    widget = relationship("Widget", back_populates="chat_sessions")

# models/chat_message.py
class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, index=True)
    room_id = Column(String(255), nullable=False)
    sender_id = Column(String(255), nullable=False)
    message = Column(String(1000), nullable=False)
    type = Column(String(20), default="text")
    created_at = Column(DateTime, default=datetime.utcnow)
