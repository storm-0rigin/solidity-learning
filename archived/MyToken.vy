# @version ^0.3.0
# @license MIT

name: public(String[64])
symbol: public(String[32])
decimals: public(uint256)
totalSupply: public(uint256)

balanceOf: public(HashMap[address, uint256])
allowances: public(HashMap[address, HashMap[address, uint256]])


@external
def __init__(_name:String[64],_symbol:String[32],_decimals:uint256,_initialSupply:uint256):
    self.name = _name
    self.symbol = _symbol
    self.decimals = _decimals
    self.totalSupply = _initialSupply * 10 ** 18
    self.balanceOf[msg.sender] += _initialSupply * 10 ** 18

@external
def transfer(_amount:uint256, _to:address):
    assert self.balanceOf[msg.sender] >= _amount, "insufficient balance"
    self.balanceOf[msg.sender] -= _amount
    self.balanceOf[_to] += _amount

@external 
def approve(_spender:address, _amount:uint256):
    # assert self.balanceOf[_owner] >= _amount, "insufficient balance"
    self.allowances[msg.sender][_spender] += _amount

@external
def transferFrom(_owner:address, _to:address, _amount:uint256):
    assert self.allowances[_owner][msg.sender] >= _amount, "insufficient allowance"
    assert self.balanceOf[_owner] >= _amount, "insufficient balance"
    self.balanceOf[_owner] -= _amount
    self.balanceOf[_to] += _amount
    self.allowances[_owner][msg.sender] -= _amount
