const deleteProduct = (button)=> {
    // Access the button element or its attributes as needed
    const productId = button.parentNode.querySelector("[name=productId]").value;
    const csrf = button.parentNode.querySelector("[name=_csrf]").value
    const productElement = button.closest("article")

    fetch(`/admin/products/${productId}`, {
        method: "DELETE",
        headers: {
            "csrf-token": csrf
        }
    }).then(result =>{
        return result.json()
    }).then(data =>{
        productElement.parentNode.removeChild(productElement)
    }).catch(err =>{
        console.log(err)
    })
}