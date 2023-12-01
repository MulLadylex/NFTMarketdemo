// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.20;

import "./interfaces/IERC20.sol";
import "./interfaces/IERC721.sol";
import "./interfaces/IERC721Receiver.sol";
import "./utils/SafeMath.sol";

contract NFTMarket is IERC721Receiver {
    IERC20 public erc20;
    IERC721 public erc721;

    bytes4 constant MAGIC_ON_ERC721_RECEIVED = 0x150b7a02;

    struct Order {
        address seller;
        uint256 tokenId;
        uint256 price;
    }

    Order[] public orders;

    mapping(uint256 => Order) public OrderOfId;
    mapping(uint256 => uint256) public idToOrderIndex;

    event Deal(address indexed seller, address indexed buyer, uint256 tokenId, uint256 price);
    event NewOrder(address indexed seller, uint256 tokenId, uint256 price);
    event CancelOrder(address indexed seller, uint256 tokenId);
    event ChangePrice(address indexed seller, uint256 tokenId, uint256 previousPrice ,uint256 price);

    constructor(IERC20 _erc20, IERC721 _erc721) {
        require(address(_erc20) != address(0), "Market: Invalid ERC20 Token");
        require(address(_erc721) != address(0), "Market: Invalid ERC721 Token");
        erc20 = _erc20;
        erc721 = _erc721;
    }

    function buy(uint256 _tokenId, uint256 _price) external {
        require(isListed(_tokenId), "Market: Token ID is not listed");

        address seller = OrderOfId[_tokenId].seller;
        address buyer = msg.sender;
        uint256 price = OrderOfId[_tokenId].price;

        require(price == _price, "Market: Price is not ehough");
        require(
            erc20.transferFrom(buyer, seller, price),
            "Market: Transfer failed"
        );
        erc721.safeTransferFrom(address(this), buyer, _tokenId);

        removeListing(_tokenId);
        emit Deal(buyer, seller, _tokenId, _price);
    }

    function cancelOrder(uint256 _tokenId) external {
        require(isListed(_tokenId), "Market: Token ID is not listed");
        require(
            msg.sender == OrderOfId[_tokenId].seller,
            "Market: Only seller can cancel order"
        );

        erc721.safeTransferFrom(address(this), msg.sender, _tokenId);

        removeListing(_tokenId);
        emit CancelOrder(msg.sender, _tokenId);
    }

    function changePrice(uint256 _tokenId, uint256 _price) external {
        require(isListed(_tokenId), "Market: Token ID is not listed");
        require(
            msg.sender == OrderOfId[_tokenId].seller,
            "Market: Only seller can change price"
        );

        uint256 previousPrice = OrderOfId[_tokenId].price;
        OrderOfId[_tokenId].price = _price;
        Order storage order = orders[idToOrderIndex[_tokenId]];
        order.price = _price;

        emit ChangePrice(msg.sender, _tokenId, previousPrice, _price);
    }

    function onERC721Received(
        address _operator,
        address _seller,
        uint256 _tokenId,
        bytes calldata _data
    ) external override returns (bytes4) {
        uint256 _price = toUint256(_data, 0);
        require(_price > 0, "Market: Invalid price");

        require(_seller != address(0), "Market: Invalid seller");
        require(!isListed(_tokenId), "Market: Token ID is already listed");

        orders.push(Order(_seller, _tokenId, _price));
        OrderOfId[_tokenId] = Order(_seller, _tokenId, _price);
        idToOrderIndex[_tokenId] = orders.length - 1;

        emit NewOrder(_seller, _tokenId, _price);

        return MAGIC_ON_ERC721_RECEIVED;
    }
     
    function isListed(uint256 _tokenId) public view returns (bool) {
        return OrderOfId[_tokenId].seller != address(0);
    }

    function removeListing(uint256 _tokenId) internal {
        uint256 lastOrderIndex = orders.length - 1;
        uint256 removedOrderIndex = idToOrderIndex[_tokenId];
        
        if (removedOrderIndex != lastOrderIndex) {
            Order storage lastOrder = orders[lastOrderIndex];
            orders[removedOrderIndex] = lastOrder;
            idToOrderIndex[lastOrder.tokenId] = removedOrderIndex;
        }
        orders.pop();

        delete OrderOfId[_tokenId];
        delete idToOrderIndex[_tokenId];
    }

    function getOrderLength() public view returns (uint256) {
        return orders.length;
    }

    function getAllNFTs() external view returns (Order[] memory) {
        return orders;
    }

    function getMyNFTs() external view returns (Order[] memory) {
        Order[] memory myOrders = new Order[](orders.length);
        uint256 myOrderIndex = 0;
        for (uint256 i = 0; i < orders.length; i++) {
            if (orders[i].seller == msg.sender) {
                myOrders[myOrderIndex] = orders[i];
                myOrderIndex++;
            }
        }
        return myOrders;
    }

    function toUint256(bytes memory _bytes, uint256 _start) internal pure returns (uint256) {
        require(_start + 32 >= _start, "Market: toUint out of range");
        require(_bytes.length >= (_start + 32), "Market: toUint256 out of range");
        uint256 tempUint;

        assembly {
            tempUint := mload(add(add(_bytes, 0x20), _start))
        }

        return tempUint;
    }
}